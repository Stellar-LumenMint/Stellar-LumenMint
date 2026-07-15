# @stellar-lumenmint/shared-types

Centralized TypeScript type definitions and constants for the LumenMint ecosystem. Used by the SDK, CLI, backend, and frontend.

## Installation

```bash
pnpm add @stellar-lumenmint/shared-types
```

## Type Categories

| Category | Types |
|---|---|
| **NFT** | `NftMetadata`, `OnChainNftData`, `Nft`, `NftAttribute` |
| **Collection** | `CollectionConfig`, `Collection` |
| **Marketplace** | `Listing`, `Auction`, `Bid`, `Order`, `ListingStatus`, `AuctionStatus`, `OrderStatus` |
| **User** | `UserProfile`, `SocialLinks` |
| **API** | `PaginatedResponse<T>`, `ApiError`, `SearchQuery`, `SearchFilters` |

## Constants

| Constant | Description |
|---|---|
| `MAX_ROYALTY_BPS` | Maximum royalty basis points (10000 = 100%) |
| `STELLAR_NETWORK` | Network configuration (TESTNET/MAINNET) |
| `SOROBAN_RPC` | Default Soroban RPC endpoints |
| `EVENT_TYPES` | Platform event type constants |
| `RATE_LIMITS` | Default rate limiting thresholds |
| `CACHE_TTL` | Default cache TTL values |
| `MAX_BATCH_SIZE` | Maximum batch operation size |
| `PAGINATION_DEFAULTS` | Default page size and limits |
