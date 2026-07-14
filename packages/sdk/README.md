# @stellar-lumenmint/sdk

TypeScript SDK for the Stellar LumenMint platform — unified REST, GraphQL, Soroban, and wallet utilities.

## Quick Start

```typescript
import LumenMintSDK from '@stellar-lumenmint/sdk';

// Testnet
const sdk = LumenMintSDK.testnet('https://api.testnet.lumenmint.com', 'your-api-key');

// Mainnet
const sdk = LumenMintSDK.mainnet('https://api.lumenmint.com', 'your-api-key');
```

## REST API

```typescript
// NFTs
const nft = await sdk.rest.getNft('nft-123');
const nfts = await sdk.rest.listNfts(1, 20, { collectionId: 'col-1' });
const meta = await sdk.rest.getNftMetadata('nft-123');

// Collections
const collection = await sdk.rest.getCollection('col-1');
const collections = await sdk.rest.listCollections();

// Listings
const listing = await sdk.rest.getListing('listing-1');
const listings = await sdk.rest.listListings(1, 20, { type: 'fixed_price' });

// Auctions
const auction = await sdk.rest.getAuction('auc-1');
const bids = await sdk.rest.getAuctionBids('auc-1');

// Users
const user = await sdk.rest.getUserProfile('user-1');
const users = await sdk.rest.searchUsers('alice');

// Search
const results = await sdk.rest.search({ q: 'pixel art', page: 1, pageSize: 20 });

// Orders
const order = await sdk.rest.getOrder('order-1');
```

## GraphQL

```typescript
const response = await sdk.graphql.query<{ nfts: { id: string; name: string }[] }>(`
  query GetNfts($collectionId: ID!) {
    nfts(collectionId: $collectionId, first: 10) {
      id
      name
      owner { id username }
    }
  }
`, { collectionId: 'col-1' });
```

## Soroban Contract Interaction

```typescript
// Read-only contract calls
const result = await sdk.soroban.simulateTransaction(
  'C...contract-id...',
  'owner_of',
  [123]
);

// Health check
const health = await sdk.soroban.getHealth();
```

## Wallet Utilities

```typescript
// Validate keys
sdk.wallet.isValidPublicKey('G...'); // true/false
sdk.wallet.isValidSecretKey('S...'); // true/false

// Generate test keypair (testnet only!)
const { publicKey, secretKey } = sdk.wallet.generateKeypair();
```

## Configuration

```typescript
const sdk = new LumenMintSDK({
  apiBaseUrl: 'https://api.lumenmint.com',
  apiKey: 'sk-...',
  networkPassphrase: 'Public Global Stellar Network ; September 2015',
  sorobanRpcUrl: 'https://soroban-rpc.creit.tech/',
  timeoutMs: 30000,
  maxRetries: 3,
});
```
