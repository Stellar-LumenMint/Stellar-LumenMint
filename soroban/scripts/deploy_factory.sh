#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Load env overrides
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
fi

NETWORK=${NETWORK:-testnet}
SOURCE=${SOURCE:-secret}

# Inject version metadata for the build
export GIT_COMMIT_HASH=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
export BUILD_TIMESTAMP=$(date -u +%s)

echo "Building collection_factory (git=$GIT_COMMIT_HASH, ts=$BUILD_TIMESTAMP)..."
cargo build --target wasm32-unknown-unknown --release --package collection_factory

echo "Deploying to $NETWORK..."

# Install WASM and capture hash
WASM_HASH=$(stellar contract upload \
  --wasm target/wasm32-unknown-unknown/release/collection_factory.wasm \
  --source-account "$SOURCE" \
  --network "$NETWORK")

echo "WASM Hash: $WASM_HASH"

# Deploy the contract instance
CONTRACT_ID=$(stellar contract deploy \
  --wasm-hash "$WASM_HASH" \
  --source-account "$SOURCE" \
  --network "$NETWORK")

echo "Contract ID: $CONTRACT_ID"

# Initialize the factory
echo "Initializing factory..."
stellar contract invoke \
  --id "$CONTRACT_ID" \
  --source-account "$SOURCE" \
  --network "$NETWORK" \
  -- \
  initialize \
  --admin "$(stellar keys public-key "$SOURCE")"

echo "Deployment complete!"
echo "Factory Address: $CONTRACT_ID"

# Record deployment in manifest
"$SCRIPT_DIR/deployment_manifest.sh" collection_factory "$CONTRACT_ID" "$WASM_HASH" "$NETWORK"
