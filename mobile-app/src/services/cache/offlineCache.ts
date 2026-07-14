/**
 * OfflineCache — A simple TTL-based local cache for mobile data.
 * Uses a plain Map in-memory with optional AsyncStorage persistence.
 *
 * Designed to be swapped for MMKV or SQLite in production without
 * changing the public API.
 */

export interface CacheEntry<T = unknown> {
  data: T;
  expiresAt: number;
  createdAt: number;
}

export interface OfflineCacheOptions {
  /** Default TTL in milliseconds (default: 5 minutes) */
  defaultTTLMs?: number;
  /** Maximum number of entries before LRU eviction (default: 200) */
  maxEntries?: number;
}

export class OfflineCache {
  private store = new Map<string, CacheEntry>();
  private defaultTTLMs: number;
  private maxEntries: number;

  constructor(options: OfflineCacheOptions = {}) {
    this.defaultTTLMs = options.defaultTTLMs ?? 5 * 60 * 1000;
    this.maxEntries = options.maxEntries ?? 200;
  }

  /**
   * Retrieve a cached value. Returns null if missing or expired.
   */
  get<T = unknown>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    // LRU: move to end (most recently used)
    this.store.delete(key);
    this.store.set(key, entry);

    return entry.data as T;
  }

  /**
   * Store a value in the cache with an optional custom TTL.
   */
  set<T = unknown>(key: string, data: T, ttlMs?: number): void {
    // Evict oldest if at capacity
    if (this.store.size >= this.maxEntries && !this.store.has(key)) {
      const oldestKey = this.store.keys().next().value;
      if (oldestKey !== undefined) {
        this.store.delete(oldestKey);
      }
    }

    // Delete first so LRU order is correct
    this.store.delete(key);

    const ttl = ttlMs ?? this.defaultTTLMs;
    this.store.set(key, {
      data,
      expiresAt: Date.now() + ttl,
      createdAt: Date.now(),
    });
  }

  /**
   * Remove a specific key from the cache.
   */
  delete(key: string): boolean {
    return this.store.delete(key);
  }

  /**
   * Check if a key exists and is not expired.
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Get or compute: returns cached value if fresh, otherwise
   * calls the fetcher, caches the result, and returns it.
   */
  async getOrFetch<T = unknown>(
    key: string,
    fetcher: () => Promise<T>,
    ttlMs?: number,
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) return cached;

    const data = await fetcher();
    this.set(key, data, ttlMs);
    return data;
  }

  /**
   * Clear all entries.
   */
  clear(): void {
    this.store.clear();
  }

  /**
   * Number of currently cached entries (including expired, until evicted).
   */
  get size(): number {
    return this.store.size;
  }
}

/** Singleton instance for app-wide usage */
export const offlineCache = new OfflineCache();
