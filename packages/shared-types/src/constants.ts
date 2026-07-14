// ── Shared Constants ─────────────────────────────────────────────────────────

/** Maximum royalty in basis points (10,000 = 100%). */
export const MAX_ROYALTY_BPS = 10_000;

/** Maximum batch size for minting operations. */
export const MAX_BATCH_SIZE = 50;

/** Default pagination page size. */
export const DEFAULT_PAGE_SIZE = 20;

/** Maximum page size. */
export const MAX_PAGE_SIZE = 100;

/** Stellar network configuration. */
export const STELLAR_NETWORK = {
  PUBLIC: 'https://horizon.stellar.org',
  TESTNET: 'https://horizon-testnet.stellar.org',
  FUTURENET: 'https://horizon-futurenet.stellar.org',
} as const;

/** Soroban RPC endpoints. */
export const SOROBAN_RPC = {
  PUBLIC: 'https://soroban-rpc.creit.tech/',
  TESTNET: 'https://soroban-testnet.stellar.org/',
  FUTURENET: 'https://rpc-futurenet.stellar.org/',
} as const;

/** Event types emitted by the platform. */
export const EVENT_TYPES = {
  NFT_CREATED: 'nft.created',
  NFT_TRANSFERRED: 'nft.transferred',
  NFT_BURNED: 'nft.burned',
  LISTING_CREATED: 'listing.created',
  LISTING_SOLD: 'listing.sold',
  LISTING_CANCELLED: 'listing.cancelled',
  AUCTION_CREATED: 'auction.created',
  BID_PLACED: 'bid.placed',
  AUCTION_SETTLED: 'auction.settled',
  ORDER_CONFIRMED: 'order.confirmed',
  COLLECTION_CREATED: 'collection.created',
  USER_REGISTERED: 'user.registered',
  SEARCH_INDEXED: 'search.indexed',
} as const;

/** Rate limit tiers in requests per minute. */
export const RATE_LIMITS = {
  DEFAULT: 100,
  CREATOR: 200,
  ADMIN: 500,
} as const;

/** Cache TTL values in seconds. */
export const CACHE_TTL = {
  NFT_DETAIL: 60,
  COLLECTION_DETAIL: 120,
  LISTING_LIST: 30,
  SEARCH_RESULTS: 60,
  USER_PROFILE: 300,
} as const;
