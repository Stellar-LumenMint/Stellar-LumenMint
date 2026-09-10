/**
 * Canonical bid-signature message helpers.
 *
 * The bid signature previously covered only `bid:{auctionId}:{amount}`,
 * which a captured signature could replay forever until the auction
 * ended. The message now includes a client timestamp and a unique nonce:
 *
 *   bid:{auctionId}:{amount}:{timestamp}:{nonce}
 *
 * Both the HTTP guard and the service build the message through this
 * single helper so the two verification paths can never diverge.
 */

/** Maximum age of a signed bid message, in milliseconds. */
export const BID_MESSAGE_MAX_AGE_MS = 5 * 60 * 1000;

/** Tolerated future clock skew for a signed bid message. */
export const BID_MESSAGE_FUTURE_SKEW_MS = 30 * 1000;

/**
 * How long a consumed nonce is remembered, in milliseconds. Longer than the
 * freshness window (plus tolerated skew) so a nonce can never be replayed
 * after its timestamp would still be accepted.
 */
export const BID_NONCE_TTL_MS =
  BID_MESSAGE_MAX_AGE_MS + BID_MESSAGE_FUTURE_SKEW_MS;

export interface BidMessageParts {
  auctionId: string;
  amount: string;
  /** Epoch milliseconds at which the client signed the message. */
  timestamp: number;
  /** Unique per-attempt value, cached to reject replays. */
  nonce: string;
}

/** Builds the canonical string a bidder must sign. */
export function buildBidMessage({
  auctionId,
  amount,
  timestamp,
  nonce,
}: BidMessageParts): string {
  return `bid:${auctionId}:${amount}:${timestamp}:${nonce}`;
}

/**
 * Returns true when the timestamp is within the accepted freshness window.
 * Exported for reuse and direct unit testing.
 */
export function isBidTimestampFresh(
  timestamp: number,
  now: number = Date.now(),
): boolean {
  if (!Number.isFinite(timestamp)) return false;
  if (timestamp > now + BID_MESSAGE_FUTURE_SKEW_MS) return false;
  return now - timestamp <= BID_MESSAGE_MAX_AGE_MS;
}

/** Cache key namespace for consumed bid nonces. */
export function bidNonceCacheKey(nonce: string): string {
  return `bid:nonce:${nonce}`;
}
