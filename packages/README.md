# Stellar LumenMint Developer Ecosystem

## Packages

| Package | Description | npm |
|---|---|---|
| `@stellar-lumenmint/shared-types` | Shared TypeScript types for NFTs, Collections, Marketplace, Users | `packages/shared-types/` |
| `@stellar-lumenmint/sdk` | Unified TypeScript SDK — REST, GraphQL, Soroban, Wallet | `packages/sdk/` |
| `@stellar-lumenmint/cli` | Developer CLI — contract deployment, NFT operations, admin | `packages/cli/` |
| `@stellar-lumenmint/ai` | AI utilities — NFT metadata generation, search, enrichment | `packages/ai/` |

## Usage

### Install

```bash
pnpm add @stellar-lumenmint/sdk @stellar-lumenmint/shared-types
```

### SDK Quick Start

```typescript
import LumenMintSDK from '@stellar-lumenmint/sdk';

const sdk = LumenMintSDK.testnet('https://api.testnet.lumenmint.com');

const nfts = await sdk.rest.listNfts(1, 20);
const nft = await sdk.rest.getNft('nft-123');
const collection = await sdk.rest.getCollection('col-1');
```

### CLI Quick Start

```bash
npx @stellar-lumenmint/cli nft:info nft-123
npx @stellar-lumenmint/cli nft:list --collection col-1
npx @stellar-lumenmint/cli health
npx @stellar-lumenmint/cli wallet:validate GABC...
```

## Developer Scripts

| Script | Description |
|---|---|
| `scripts/setup-dev.sh` | Set up full development environment |
| `scripts/deploy-contracts.sh` | Build and deploy Soroban contracts |
| `scripts/seed-db.sh` | Seed database with test data |

## Development

```bash
# Install all dependencies
bash scripts/setup-dev.sh

# Build all packages
pnpm build

# Typecheck all packages
pnpm typecheck
```
