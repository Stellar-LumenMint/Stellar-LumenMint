#!/bin/bash
# Initialises the contracts recorded in deployments/manifest.json.
#
# `deploy_all.sh` only uploads and deploys Wasm; a freshly deployed instance is
# inert until its admin, fee configuration, settlement asset and allowlists are
# set. Doing that by hand is how a deployment drifts from what the repository
# documents, so the same step is scripted here and called by `deploy_all.sh`.
#
# Usage: NETWORK=testnet SOURCE=mykey ./scripts/initialize_all.sh
#        NETWORK=mainnet MAINNET_CONFIRM=yes SOURCE=mykey ./scripts/initialize_all.sh
#
# Overrides:
#   ADMIN           admin address (defaults to the public key of SOURCE)
#   FEE_RECIPIENT   account that receives the platform fee (defaults to ADMIN)
#   PLATFORM_FEE_BPS  platform fee in basis points (default 250 = 2.5%)
#   XLM_SAC         Stellar Asset Contract to accept for settlement
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOYMENTS_DIR="$SCRIPT_DIR/../deployments"
MANIFEST="$DEPLOYMENTS_DIR/manifest.json"

if [ -f "$SCRIPT_DIR/../.env" ]; then
    set -a
    # shellcheck disable=SC1091
    . "$SCRIPT_DIR/../.env"
    set +a
fi

NETWORK="${NETWORK:-}"
SOURCE="${SOURCE:-secret}"

if [ -z "$NETWORK" ]; then
    echo "ERROR: NETWORK must be set explicitly (testnet | mainnet | local)." >&2
    echo "  Example: NETWORK=testnet SOURCE=mykey ./scripts/initialize_all.sh" >&2
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
    echo "ERROR: initialising mainnet requires MAINNET_CONFIRM=yes" >&2
    exit 1
fi

if [ ! -f "$MANIFEST" ]; then
    echo "ERROR: no manifest at $MANIFEST — run deploy_all.sh first." >&2
    exit 1
fi

# jq and the stellar CLI are hard requirements: a partial initialisation that
# silently skipped a contract would be worse than not running at all.
for bin in jq stellar; do
    command -v "$bin" >/dev/null 2>&1 || {
        echo "ERROR: $bin is required but not on PATH." >&2
        exit 1
    }
done

# The most recent entry for each contract on this network is the live one;
# earlier entries are superseded history.
latest_id() {
    jq -r --arg c "$1" --arg n "$NETWORK" \
        '[.deployments[] | select(.contract == $c and .network == $n)] | last | .contract_id // empty' \
        "$MANIFEST"
}

ADMIN="${ADMIN:-$(stellar keys public-key "$SOURCE")}"
FEE_RECIPIENT="${FEE_RECIPIENT:-$ADMIN}"
PLATFORM_FEE_BPS="${PLATFORM_FEE_BPS:-250}"

# Testnet and mainnet both host the native XLM Stellar Asset Contract; the
# address is network-specific but stable.
case "$NETWORK" in
    mainnet) DEFAULT_XLM_SAC="CAS3J7GYLGXMF6TDJBBYYSE3HQ6BBSMLNUQ34T6TZMYMW2EVH34XOWMA" ;;
    *) DEFAULT_XLM_SAC="CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC" ;;
esac
XLM_SAC="${XLM_SAC:-$DEFAULT_XLM_SAC}"

NFT_ID="$(latest_id nft_contract)"
FACTORY_ID="$(latest_id collection_factory)"
SETTLEMENT_ID="$(latest_id marketplace_settlement)"
TRANSACTION_ID="$(latest_id transaction_contract)"

for pair in "nft_contract:$NFT_ID" "collection_factory:$FACTORY_ID" \
    "marketplace_settlement:$SETTLEMENT_ID" "transaction_contract:$TRANSACTION_ID"; do
    if [ -z "${pair#*:}" ]; then
        echo "ERROR: no $NETWORK deployment for ${pair%%:*} in the manifest." >&2
        echo "       Run deploy_all.sh so every contract has a recorded id." >&2
        exit 1
    fi
done

echo "Initialising $NETWORK contracts"
echo "  admin:          $ADMIN"
echo "  fee recipient:  $FEE_RECIPIENT"
echo "  platform fee:   ${PLATFORM_FEE_BPS} bps"
echo "  XLM SAC:        $XLM_SAC"
echo ""

invoke() {
    local contract_id="$1"
    shift
    stellar contract invoke \
        --id "$contract_id" \
        --source-account "$SOURCE" \
        --network "$NETWORK" \
        -- "$@"
}

# --- collection_factory ------------------------------------------------------
# Admin plus the asset the factory charges collection fees in. Both are stored
# once and never re-read from the caller, so this is idempotent only in the
# sense that a second call fails loudly rather than overwriting the admin.
echo "--- collection_factory ---"
invoke "$FACTORY_ID" initialize --admin "$ADMIN" --fee_asset "$XLM_SAC"

# --- nft_contract ------------------------------------------------------------
# Collection metadata plus the default royalty applied to tokens that do not
# set their own. The royalty is validated against MAX_ROYALTY_BPS on-chain.
echo "--- nft_contract ---"
invoke "$NFT_ID" initialize \
    --admin "$ADMIN" \
    --config '{
        "name": "LumenMint",
        "symbol": "LMNT",
        "base_uri": "https://stellar-lumenmint.vercel.app/api/nft/",
        "max_supply": null,
        "mint_price": null,
        "is_revealed": true,
        "metadata_is_frozen": false
    }' \
    --default_royalty "{\"recipient\":\"$FEE_RECIPIENT\",\"percentage\":500}"

# --- marketplace_settlement --------------------------------------------------
# Admin, fee configuration, the settlement asset and both allowlists. A sale
# against an NFT or token contract that is not allowlisted is rejected, so
# these three calls are what make the deployment usable rather than merely
# live.
echo "--- marketplace_settlement ---"
invoke "$SETTLEMENT_ID" initialize \
    --admin "$ADMIN" \
    --fee_config "{
        \"platform_fee_bps\": $PLATFORM_FEE_BPS,
        \"minimum_fee\": \"0\",
        \"maximum_fee\": \"1000000000\",
        \"fee_recipient\": \"$FEE_RECIPIENT\",
        \"dynamic_fee_enabled\": false,
        \"volume_discounts\": [],
        \"vip_exemptions\": []
    }"

invoke "$SETTLEMENT_ID" add_supported_asset \
    --admin "$ADMIN" \
    --asset "{\"contract\":\"$XLM_SAC\",\"symbol\":\"XLM\"}"

invoke "$SETTLEMENT_ID" add_allowed_nft_contract \
    --admin "$ADMIN" --contract "$NFT_ID"

invoke "$SETTLEMENT_ID" add_allowed_token_contract \
    --admin "$ADMIN" --contract "$XLM_SAC"

# --- transaction_contract ----------------------------------------------------
# Deliberately uninitialised: it has no admin, fee configuration or allowlist,
# and every entry point is scoped to the creator that signed it. Reading its
# version is still worth doing, because it proves the deployed instance is the
# one this repository builds.
echo "--- transaction_contract (no initialisation required) ---"

# --- Verification ------------------------------------------------------------
# A deployment is only "working" if the state we just wrote is readable back.
echo ""
echo "Verifying $NETWORK deployment..."

verify() {
    local label="$1" contract_id="$2" fn="$3"
    local out
    if ! out="$(invoke "$contract_id" "$fn" 2>&1)"; then
        echo "  FAIL  $label.$fn -> $out" >&2
        return 1
    fi
    echo "  OK    $label.$fn -> $out"
}

verify nft_contract "$NFT_ID" version
verify collection_factory "$FACTORY_ID" version
verify marketplace_settlement "$SETTLEMENT_ID" get_supported_assets
verify transaction_contract "$TRANSACTION_ID" version

echo ""
echo "All contracts initialised. Recorded ids live in $MANIFEST."
