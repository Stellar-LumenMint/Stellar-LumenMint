# Deployment Manifest

Tracks deployed contract addresses across environments.

## Structure

```json
{
  "network": "testnet",
  "contracts": {
    "nft_contract": { "address": "C...", "wasmHash": "..." },
    "marketplace_settlement": { "address": "C...", "wasmHash": "..." },
    "transaction_contract": { "address": "C...", "wasmHash": "..." },
    "collection_factory": { "address": "C...", "wasmHash": "..." }
  },
  "deployedAt": "2026-07-15T12:00:00Z",
  "deployedBy": "G..."
}
```

## Usage

Contract addresses from the manifest are used by the backend via environment variables:
- `FACTORY_CONTRACT_ID`
- `MARKETPLACE_CONTRACT_ID`
- `NFT_CONTRACT_ID`
- `TRANSACTION_CONTRACT_ID`
