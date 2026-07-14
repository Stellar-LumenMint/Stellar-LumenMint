/**
 * AppErrorCode — Centralized error codes used across all backend modules.
 *
 * Organized by domain. Used in exception filters and error responses
 * to provide consistent, machine-readable error codes to API consumers.
 */
export enum AppErrorCode {
  // ── General ──────────────────────────────────────────────
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  TOO_MANY_REQUESTS = 'TOO_MANY_REQUESTS',
  CONFLICT = 'CONFLICT',
  BAD_REQUEST = 'BAD_REQUEST',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  GATEWAY_TIMEOUT = 'GATEWAY_TIMEOUT',

  // ── Auth ─────────────────────────────────────────────────
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  TOKEN_INVALID = 'TOKEN_INVALID',
  EMAIL_NOT_VERIFIED = 'EMAIL_NOT_VERIFIED',
  WALLET_SIGNATURE_INVALID = 'WALLET_SIGNATURE_INVALID',
  WALLET_CHALLENGE_EXPIRED = 'WALLET_CHALLENGE_EXPIRED',

  // ── NFT ──────────────────────────────────────────────────
  NFT_NOT_FOUND = 'NFT_NOT_FOUND',
  NFT_ALREADY_MINTED = 'NFT_ALREADY_MINTED',
  NFT_MINT_FAILED = 'NFT_MINT_FAILED',
  NFT_TRANSFER_FAILED = 'NFT_TRANSFER_FAILED',

  // ── Collection ───────────────────────────────────────────
  COLLECTION_NOT_FOUND = 'COLLECTION_NOT_FOUND',
  COLLECTION_LIMIT_EXCEEDED = 'COLLECTION_LIMIT_EXCEEDED',

  // ── Marketplace ──────────────────────────────────────────
  LISTING_NOT_FOUND = 'LISTING_NOT_FOUND',
  LISTING_ALREADY_SOLD = 'LISTING_ALREADY_SOLD',
  INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE',
  BID_TOO_LOW = 'BID_TOO_LOW',
  AUCTION_ENDED = 'AUCTION_ENDED',
  AUCTION_NOT_FOUND = 'AUCTION_NOT_FOUND',
  ORDER_NOT_FOUND = 'ORDER_NOT_FOUND',

  // ── Stellar / Soroban ────────────────────────────────────
  SOROBAN_RPC_ERROR = 'SOROBAN_RPC_ERROR',
  SOROBAN_TIMEOUT = 'SOROBAN_TIMEOUT',
  STELLAR_TRANSACTION_FAILED = 'STELLAR_TRANSACTION_FAILED',
  STELLAR_NETWORK_ERROR = 'STELLAR_NETWORK_ERROR',
  CONTRACT_CALL_FAILED = 'CONTRACT_CALL_FAILED',

  // ── Storage ──────────────────────────────────────────────
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  UNSUPPORTED_FILE_TYPE = 'UNSUPPORTED_FILE_TYPE',
  UPLOAD_FAILED = 'UPLOAD_FAILED',

  // ── Search ───────────────────────────────────────────────
  SEARCH_INDEX_ERROR = 'SEARCH_INDEX_ERROR',
  SEARCH_QUERY_INVALID = 'SEARCH_QUERY_INVALID',
}
