// ── Idempotency Types ────────────────────────────────────────────────────────

/** Result of an idempotent operation. */
export interface IdempotencyResult {
  /** Whether this is a duplicate request (already processed). */
  isDuplicate: boolean;
  /** The original result if this is a duplicate, or undefined. */
  originalResult?: string;
  /** When the idempotency record was created. */
  createdAt?: string;
}

/** Configuration for the idempotency service. */
export interface IdempotencyConfig {
  /** TTL in seconds for idempotency keys. Default: 86400 (24h). */
  ttlSeconds?: number;
  /** Key prefix for Redis. Default: 'idem'. */
  keyPrefix?: string;
}
