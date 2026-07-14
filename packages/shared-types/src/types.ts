// ── NFT Types ────────────────────────────────────────────────────────────────

/** Standard NFT metadata following ERC-721 Metadata JSON Schema. */
export interface NftMetadata {
  id: string;
  name: string;
  description?: string;
  image: string;
  externalUrl?: string;
  animationUrl?: string;
  backgroundColor?: string;
  attributes: NftAttribute[];
}

export interface NftAttribute {
  traitType: string;
  value: string | number | boolean;
  displayType?: 'number' | 'boost_number' | 'boost_percentage' | 'date';
  maxValue?: number;
}

/** On-chain NFT data record. */
export interface OnChainNftData {
  tokenId: number;
  contractId: string;
  owner: string;
  creator: string;
  metadataUri: string;
  royaltyPercentage: number; // basis points (0–10000)
  royaltyRecipient: string;
  createdAt: number; // ledger timestamp
  transferCount: number;
  lastTransferAt: number;
  editionNumber?: number;
  totalEditions?: number;
}

/** NFT as returned by the API. */
export interface Nft {
  id: string;
  contractId: string;
  tokenId: number;
  owner: string;
  creator: string;
  metadataUri: string;
  metadata?: NftMetadata;
  royaltyPercentage: number;
  royaltyRecipient: string;
  createdAt: string;
  transferCount: number;
  lastTransferAt: string;
  collectionId?: string;
  collectionName?: string;
  isListed: boolean;
  listingPrice?: string;
  listingCurrency?: string;
}

// ── Collection Types ─────────────────────────────────────────────────────────

export interface CollectionConfig {
  name: string;
  symbol: string;
  description?: string;
  image?: string;
  bannerImage?: string;
  externalUrl?: string;
  maxSupply?: number;
  mintPrice?: string;
  isRevealed: boolean;
  metadataFrozen: boolean;
  royaltyPercentage?: number;
  royaltyRecipient?: string;
}

export interface Collection {
  id: string;
  contractId: string;
  name: string;
  symbol: string;
  description?: string;
  image?: string;
  bannerImage?: string;
  creatorAddress: string;
  totalSupply: number;
  maxSupply?: number;
  floorPrice?: string;
  volume24h?: string;
  volumeTotal?: string;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

// ── Marketplace Types ────────────────────────────────────────────────────────

export type ListingType = 'fixed_price' | 'auction' | 'open_for_offers';
export type ListingStatus = 'active' | 'sold' | 'cancelled' | 'expired';

export interface Listing {
  id: string;
  nftId: string;
  sellerAddress: string;
  type: ListingType;
  status: ListingStatus;
  price: string;
  currency: string;
  startDate: string;
  endDate?: string;
  reservePrice?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Auction {
  id: string;
  listingId: string;
  nftId: string;
  sellerAddress: string;
  startPrice: string;
  reservePrice?: string;
  currentBid?: string;
  currentBidder?: string;
  bidCount: number;
  startDate: string;
  endDate: string;
  status: 'pending' | 'active' | 'ended' | 'settled' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

export interface Bid {
  id: string;
  auctionId: string;
  bidderAddress: string;
  amount: string;
  currency: string;
  txHash?: string;
  ledgerSequence?: number;
  status: 'pending' | 'confirmed' | 'rejected' | 'outbid';
  createdAt: string;
}

export interface Order {
  id: string;
  buyerAddress: string;
  sellerAddress: string;
  nftId: string;
  listingId?: string;
  auctionId?: string;
  price: string;
  currency: string;
  platformFee: string;
  royaltyFee: string;
  sellerPayout: string;
  txHash?: string;
  status: 'pending' | 'confirmed' | 'failed' | 'cancelled';
  createdAt: string;
}

// ── User Types ───────────────────────────────────────────────────────────────

export interface UserProfile {
  id: string;
  username: string;
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
  bannerUrl?: string;
  socialLinks?: SocialLinks;
  walletAddress?: string;
  isVerified: boolean;
  createdAt: string;
}

export interface SocialLinks {
  twitter?: string;
  website?: string;
  discord?: string;
  telegram?: string;
  instagram?: string;
}

// ── API Types ────────────────────────────────────────────────────────────────

/** Standard paginated API response. */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasNextPage: boolean;
}

/** Standard API error response. */
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  correlationId?: string;
  timestamp: string;
}

/** Search query parameters. */
export interface SearchQuery {
  q: string;
  filters?: SearchFilters;
  sort?: SearchSort;
  page?: number;
  pageSize?: number;
}

export interface SearchFilters {
  collectionId?: string;
  creatorAddress?: string;
  priceMin?: string;
  priceMax?: string;
  attributes?: Record<string, string>;
  listingType?: ListingType;
  currency?: string;
  onSaleOnly?: boolean;
}

export type SearchSort = 'relevance' | 'price_asc' | 'price_desc' | 'newest' | 'oldest' | 'most_viewed';
