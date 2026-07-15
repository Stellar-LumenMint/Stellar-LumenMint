# Stellar LumenMint CLI

Command-line interface for managing LumenMint NFTs, collections, contracts, and platform operations.

## Installation

```bash
pnpm add @stellar-lumenmint/cli
```

Or use directly via `npx`:

```bash
npx @stellar-lumenmint/cli health --api http://localhost:3000
```

## Commands

### `nft:info <id>`
Query a single NFT by ID.

```bash
lumenmint nft:info nft-abc123 --api https://api.testnet.lumenmint.com
```

### `nft:list`
List NFTs with pagination and optional filters.

```bash
lumenmint nft:list --page 1 --limit 20 --collection col-1
```

### `collection:info <id>`
Query collection details by ID.

```bash
lumenmint collection:info col-masterpieces
```

### `contract:deploy`
Deploy a Soroban smart contract to the Stellar network.

```bash
lumenmint contract:deploy --wasm ./nft_contract.wasm --source S...
```

### `contract:invoke <contract-id> <method>`
Invoke a method on a deployed Soroban contract.

```bash
lumenmint contract:invoke CABC... owner_of --args '[123]'
```

### `admin:stats`
Get platform-level statistics.

```bash
lumenmint admin:stats --api https://api.lumenmint.com
```

### `health`
Check API and Soroban RPC health.

```bash
lumenmint health --api http://localhost:3000
```

### `wallet:validate <address>`
Validate a Stellar public key format.

```bash
lumenmint wallet:validate GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMKJS
```

## Configuration

| Env Variable | Description | Default |
|---|---|---|
| `LUMENMINT_API_URL` | Base URL for API commands | `http://localhost:3000` |
| `STELLAR_SECRET_KEY` | Stellar secret key for contract operations | — |
| `SOROBAN_RPC_URL` | Soroban RPC endpoint | Built-in testnet default |
