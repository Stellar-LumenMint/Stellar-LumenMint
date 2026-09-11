/**
 * Shared pagination helpers.
 *
 * REST and GraphQL entry points accept caller-supplied page/limit values.
 * Without clamping, a request like `?limit=1000000000` makes the database
 * scan and return the entire table — a cheap DoS vector. Every service that
 * translates these values into `skip()`/`take()` should route them through
 * these helpers (defense in depth, even where DTO decorators already bound
 * the input).
 */

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

/** Clamp a caller-supplied limit to [1, MAX_PAGE_SIZE], defaulting to 20. */
export function clampLimit(limit: unknown): number {
  const value = Number(limit);
  if (!Number.isFinite(value) || value < 1) {
    return DEFAULT_PAGE_SIZE;
  }
  return Math.min(Math.floor(value), MAX_PAGE_SIZE);
}

/** Clamp a caller-supplied page to >= 1, defaulting to 1. */
export function clampPage(page: unknown): number {
  const value = Number(page);
  if (!Number.isFinite(value) || value < 1) {
    return 1;
  }
  return Math.floor(value);
}
