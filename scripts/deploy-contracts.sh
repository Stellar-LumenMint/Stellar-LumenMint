#!/usr/bin/env bash
# ── LumenMint Contract Deployment ─────────────────────────────────────────────
# Usage: bash scripts/deploy-contracts.sh [testnet|futurenet]

set -euo pipefail

NETWORK="${1:-testnet}"

echo "🚀 Deploying LumenMint contracts to ${NETWORK}..."

# ── Check prerequisites ───────────────────────────────────────────────────────

command -v soroban >/dev/null 2>&1 || {
  echo "❌ soroban CLI not found. Install: cargo install soroban-cli"
  exit 1
}

command -v rustc >/dev/null 2>&1 || {
  echo "❌ Rust not found. Install from https://rustup.rs"
  exit 1
}

# ── Build contracts ───────────────────────────────────────────────────────────

echo ""
echo "📦 Building contracts..."

CONTRACTS=(
  "nft_contract"
  "marketplace_settlement"
  "collection_factory"
  "transaction_contract"
)

for contract in "${CONTRACTS[@]}"; do
  echo "  → building ${contract}..."
  (cd "soroban/contracts/${contract}" && cargo build --release --target wasm32-unknown-unknown)
  echo "  ✅ ${contract} built"
done

# ── Deploy contracts ──────────────────────────────────────────────────────────

echo ""
echo "📤 Deploying contracts to ${NETWORK}..."

deploy_contract() {
  local wasm_path="soroban/contracts/$1/target/wasm32-unknown-unknown/release/$1.wasm"
  local contract_id

  contract_id=$(soroban contract deploy \
    --wasm "${wasm_path}" \
    --source "${DEPLOYER_SECRET:?Set DEPLOYER_SECRET env var}" \
    --network "${NETWORK}" \
    2>&1)

  echo "  ✅ $1 deployed: ${contract_id}"
  echo "${contract_id}"
}

NFT_CONTRACT_ID=$(deploy_contract "nft_contract")
MARKETPLACE_ID=$(deploy_contract "marketplace_settlement")
FACTORY_ID=$(deploy_contract "collection_factory")
TX_CONTRACT_ID=$(deploy_contract "transaction_contract")

# ── Save deployment info ──────────────────────────────────────────────────────

DEPLOY_FILE="soroban/deployments/manifest.json"

mkdir -p "$(dirname "${DEPLOY_FILE}")"

cat > "${DEPLOY_FILE}" << EOF
{
  "network": "${NETWORK}",
  "deployedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "contracts": {
    "nft_contract": "${NFT_CONTRACT_ID}",
    "marketplace_settlement": "${MARKETPLACE_ID}",
    "collection_factory": "${FACTORY_ID}",
    "transaction_contract": "${TX_CONTRACT_ID}"
  }
}
EOF

# ── Done ──────────────────────────────────────────────────────────────────────

echo ""
echo "🎉 All contracts deployed to ${NETWORK}!"
echo ""
echo "Contract addresses:"
echo "  NFT Contract:        ${NFT_CONTRACT_ID}"
echo "  Marketplace:         ${MARKETPLACE_ID}"
echo "  Collection Factory:  ${FACTORY_ID}"
echo "  Transaction:         ${TX_CONTRACT_ID}"
echo ""
echo "Deployment manifest saved to ${DEPLOY_FILE}"
echo ""
echo "Next steps:"
echo "  1. Update .env files with contract addresses"
echo "  2. Run: bash scripts/seed-db.sh"
echo "  3. Start the backend: cd backend && pnpm start:dev"
echo ""
