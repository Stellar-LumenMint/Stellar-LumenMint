# GraphQL Gateway

NestJS GraphQL gateway providing a unified API over REST and database services.

## Module Structure

```
graphql/
├── context/           # Request context factory (user, locale, headers)
├── middleware/         # Auth (JWT validation) and logging middleware
├── resolvers/         # Query and mutation resolvers
└── loaders/           # DataLoader batching for N+1 prevention
```

## Resolvers

| Resolver | Queries | Mutations |
|---|---|---|
| `NftResolver` | `nft`, `nfts`, `userNfts` | `mintNft`, `transferNft` |
| `CollectionResolver` | `collection`, `collections` | `createCollection` |
| `AuctionResolver` | `auction`, `auctions` | `createAuction`, `placeBid`, `settleAuction` |
| `ListingResolver` | `listing`, `listings` | `createListing`, `cancelListing`, `buyNft` |
| `OrderResolver` | `order`, `orders` | — |
| `UserResolver` | `user`, `users` | — |
| `PublicCreatorResolver` | `publicCreator` | — |

## Authentication

The `GraphqlAuthMiddleware` extracts and validates JWT tokens from request headers. The `GqlAuthGuard` protects mutation resolvers. Public queries (listings, collections) are accessible without authentication.

## Playground

GraphQL Playground is available in development at `/graphql` when `GRAPHQL_PLAYGROUND_ENABLED=true`.

## DataLoader

All relation fields (e.g., `nft.collection`, `collection.nfts`) use DataLoader to batch database queries and avoid N+1 problems.
