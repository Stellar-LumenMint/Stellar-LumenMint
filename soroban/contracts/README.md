# Stellar LumenMint — Soroban Smart Contracts

Stellar Soroban smart contracts for NFT minting, marketplace settlement, and transaction batching.

## Contracts

| Contract | Purpose |
|---|---|
| `nft_contract` | NFT token contract (SEP-41 compliant) with metadata, royalties, access control |
| `marketplace_settlement` | Auction/sale settlement with atomic swaps, escrow, dispute resolution |
| `transaction_contract` | Batched transaction execution with gas optimization |
| `collection_factory` | Factory for deploying new NFT collection contracts |

## Build & Deploy

```bash
cd soroban
cargo build --target wasm32-unknown-unknown --release
./scripts/deploy_all.sh
```

## Testing

```bash
cargo test --workspace
```

## Contract Architecture

Each contract follows the same structure:
```
contracts/<name>/src/
├── lib.rs          # Contract entry point
├── types.rs        # Storage types and enums
├── storage.rs      # Storage access patterns
├── events.rs       # Contract event emission
├── error.rs        # Error codes
├── interface.rs    # Public trait interface
├── access_control.rs  # Role-based access
├── test.rs         # Unit tests
└── build.rs        # Build configuration
```
