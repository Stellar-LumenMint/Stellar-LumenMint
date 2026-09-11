// Canonical types for Marketplace Settlement contract integration.
//
// This is the single source of truth for the shapes exchanged with the
// `marketplace_settlement` Soroban contract. It previously lived in two
// files (`src/shared/contracts` and `src/modules/shared/contracts`) that had
// already drifted apart, so a change to one silently missed the other.
// Consumers must import from here.

export type AuctionType = 'english' | 'dutch';

export interface CreateAuctionParams {
  seller: string;
  nftContract: string;
  tokenId: string;
  startPrice: string;
  reservePrice: string;
  currency: string;
  auctionType: AuctionType;
  durationSeconds: number;
}

export interface CreateSaleParams {
  seller: string;
  nftContract: string;
  tokenId: string;
  price: string;
  currency: string;
  durationSeconds: number;
}

export interface CreateTradeParams {
  initiator: string;
  offeredNftContract: string;
  offeredTokenId: string;
  requestedNftContract: string;
  requestedTokenId: string;
  expiresAt: string;
}

export interface CreateBundleParams {
  seller: string;
  items: { nftContract: string; tokenId: string }[];
  totalPrice: string;
  currency: string;
  durationSeconds: number;
}

export interface AcceptOfferParams {
  offerId: string;
  owner: string;
  bidder: string;
  nftContractId: string;
  nftTokenId: string;
  /** XLM amount as a string (i128) */
  amount: string;
  currency: string;
}

/** Outcome of submitting a settlement transaction. */
export interface ExecutionResult {
  success: boolean;
  txHash: string;
  error?: string;
}

export interface SaleTransaction {
  id: number;
  seller: string;
  nftContract: string;
  tokenId: string;
  price: string;
  currency: string;
  buyer?: string;
  status: string;
  createdAt: string;
  expiresAt: string;
}

export interface AuctionTransaction {
  id: number;
  seller: string;
  nftContract: string;
  tokenId: string;
  startPrice: string;
  reservePrice: string;
  currency: string;
  auctionType: string;
  status: string;
  highestBid?: string;
  winner?: string;
  createdAt: string;
  endsAt: string;
}
