#!/bin/bash
# Builds and deploys all Stellar-LumenMint Stellar contracts, recording each deployment
# in deployments/manifest.json.
# Usage: NETWORK=testnet SOURCE=mykey ./scripts/deploy_all.sh
#        NETWORK=mainnet MAINNET_CONFIRM=yes SOURCE=mykey ./scripts/deploy_all.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ -f .env ]; then
    # Source .env safely (set -a exports every assignment; plain `xargs`
    # would split values containing spaces and mishandle quoted strings).
    set -a
    # shellcheck disable=SC1091
    . ./.env
    set +a
fi

# The network must be explicit: defaulting to testnet risks an accidental
# mainnet deploy the moment someone forgets the env var.
NETWORK="${NETWORK:-}"
SOURCE="${SOURCE:-secret}"

if [ -z "$NETWORK" ]; then
    echo "ERROR: NETWORK must be set explicitly (testnet | mainnet | local)." >&2
    echo "  Example: NETWORK=testnet SOURCE=mykey ./scripts/deploy_all.sh" >&2
    exit 1
fi

case "$NETWORK" in
    testnet | mainnet | local) ;;
    *)
        echo "ERROR: unknown NETWORK '$NETWORK' (expected testnet | mainnet | local)" >&2
        exit 1
        ;;
esac

if [ "$NETWORK" = "mainnet" ] && [ "${MAINNET_CONFIRM:-}" != "yes" ]; then
    echo "ERROR: deploying to mainnet requires MAINNET_CONFIRM=yes" >&2
    exit 1
fi

export GIT_COMMIT_HASH=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
export BUILD_TIMESTAMP=$(date -u +%s)

CONTRACTS=(collection_factory nft_contract marketplace_settlement transaction_contract)

echo "Building all contracts (git=$GIT_COMMIT_HASH, ts=$BUILD_TIMESTAMP, network=$NETWORK)..."
for CONTRACT in "${CONTRACTS[@]}"; do
    cargo build --target wasm32-unknown-unknown --release --package "$CONTRACT"
done

deploy_contract() {
    local CONTRACT="$1"
    local WASM="target/wasm32-unknown-unknown/release/${CONTRACT}.wasm"

    echo ""
    echo "--- Deploying $CONTRACT ---"

    WASM_HASH=$(stellar contract upload \
        --wasm "$WASM" \
        --source-account "$SOURCE" \
        --network "$NETWORK")
    echo "  WASM Hash: $WASM_HASH"

    CONTRACT_ID=$(stellar contract deploy \
        --wasm-hash "$WASM_HASH" \
        --source-account "$SOURCE" \
        --network "$NETWORK")
    echo "  Contract ID: $CONTRACT_ID"

    "$SCRIPT_DIR/deployment_manifest.sh" "$CONTRACT" "$CONTRACT_ID" "$WASM_HASH" "$NETWORK"
}

for CONTRACT in "${CONTRACTS[@]}"; do
    deploy_contract "$CONTRACT"
done

# A deployed instance is inert until its admin, fee configuration, settlement
# asset and allowlists are set. Initialisation lives in its own script so it can
# also be re-run against an existing manifest after a partial failure.
echo ""
echo "Initialising deployed contracts..."
NETWORK="$NETWORK" SOURCE="$SOURCE" "$SCRIPT_DIR/initialize_all.sh"

echo ""
echo "All contracts deployed and initialised. Manifest updated at deployments/manifest.json"
