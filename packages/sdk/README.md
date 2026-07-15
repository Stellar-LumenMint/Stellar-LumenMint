# @stellar-lumenmint/sdk

Unified TypeScript SDK for the LumenMint platform — REST API, GraphQL, Soroban contracts, and wallet utilities.

## Installation

```bash
pnpm add @stellar-lumenmint/sdk @stellar-lumenmint/shared-types
```

## Quick Start

```typescript
import LumenMintSDK from '@stellar-lumenmint/sdk';

const sdk = LumenMintSDK.testnet('https://api.testnet.lumenmint.com');

// Read operations
const nfts = await sdk.rest.listNfts(1, 20);
const collection = await sdk.rest.getCollection('col-1');

// Write operations (requires auth)
const sdkAuth = LumenMintSDK.testnet('https://api.testnet.lumenmint.com', 'your-jwt-token');
await sdkAuth.rest.mintNft({ name: 'My NFT', metadataUri: 'ipfs://...' });
await sdkAuth.rest.createListing({ nftId: 'nft-1', price: '100' });
```

## API Reference

### RestClient

| Category | Methods |
|---|---|
| **NFTs** | `getNft`, `listNfts`, `getNftMetadata`, `mintNft`, `transferNft` |
| **Collections** | `getCollection`, `listCollections`, `createCollection` |
| **Listings** | `getListing`, `listListings`, `createListing`, `cancelListing`, `buyNft` |
| **Auctions** | `getAuction`, `getAuctionBids`, `placeBid`, `settleAuction` |
| **Users** | `getUserProfile`, `searchUsers`, `updateProfile` |
| **Search** | `search` |

### GraphQLClient

```typescript
const { data } = await sdk.graphql.query<{ nft: Nft }>(`
  query GetNft($id: ID!) { nft(id: $id) { id name image } }
`, { id: 'nft-1' });
```

### SorobanClient

```typescript
const result = await sdk.soroban.simulateReadCall('CABC...', 'owner_of', [tokenId]);
const health = await sdk.soroban.getHealth();
```

### WalletUtils

```typescript
const keypair = await sdk.wallet.generateKeypair();
const valid = sdk.wallet.isValidPublicKey('GABC...');
```

## Error Handling

All errors are typed:

```typescript
try {
  await sdk.rest.mintNft({ name: 'x' });
} catch (err) {
  if (err instanceof SdkError) {
    console.error(err.code, err.statusCode, err.correlationId);
  }
}
```

Error types: `SdkError`, `AuthError`, `RateLimitError`, `NotFoundError`, `TimeoutError`.
