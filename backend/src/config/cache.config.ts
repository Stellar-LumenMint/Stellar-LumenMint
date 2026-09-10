import type { CacheManagerOptions } from '@nestjs/cache-manager';
import type { ConfigService } from '@nestjs/config';
import { createKeyv } from '@keyv/redis';

/**
 * Shared cache configuration.
 *
 * `@nestjs/cache-manager` v3 is built on cache-manager v7, which only
 * understands Keyv-backed stores passed through the `stores` option. The
 * previous configuration passed a legacy `cache-manager-redis-store` factory
 * via `store:` plus `host`/`port`/`password` options; cache-manager ignores
 * all of those, so every deployment silently fell back to the default
 * in-memory cache. Rate limits, idempotency keys and consumed bid nonces were
 * therefore per-process and lost on restart.
 *
 * This module resolves the cache configuration once and builds the correct
 * option shape: a Keyv Redis store when Redis is configured, and the
 * in-memory default otherwise (including in tests, so suites stay hermetic).
 */

/** Default cache TTL, in milliseconds (5 minutes). */
export const DEFAULT_CACHE_TTL_MS = 300_000;

/** Key prefix so cache entries cannot collide with other Redis users. */
export const CACHE_NAMESPACE = 'lumenmint';

export interface CacheEnv {
  nodeEnv?: string;
  redisUrl?: string;
  redisHost?: string;
  redisPort?: string;
  redisPassword?: string;
  redisDb?: string;
  /** `CACHE_TTL` is expressed in seconds for backwards compatibility. */
  cacheTtl?: string;
}

export type CacheMode = 'redis' | 'memory';

export interface ResolvedCacheConfig {
  mode: CacheMode;
  /** Present only when `mode === 'redis'`. */
  redisUrl?: string;
  ttlMs: number;
  namespace: string;
}

/**
 * `CACHE_TTL` is documented as seconds (`.env.example` ships `300`), so it is
 * converted to the milliseconds cache-manager v7 expects. Invalid or
 * non-positive values fall back to the default.
 */
export function resolveCacheTtlMs(cacheTtlSeconds?: string): number {
  const seconds = Number.parseInt(cacheTtlSeconds ?? '', 10);
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return DEFAULT_CACHE_TTL_MS;
  }
  return seconds * 1000;
}

/**
 * Builds the Redis connection URL. An explicit `REDIS_URL` wins; otherwise the
 * discrete host/port/password/db variables are assembled. Password and host
 * are URL-encoded so credentials containing reserved characters cannot produce
 * a malformed URL. Returns `undefined` when Redis is not configured.
 */
export function buildRedisUrl(env: CacheEnv): string | undefined {
  const explicit = env.redisUrl?.trim();
  if (explicit) {
    return explicit;
  }

  const host = env.redisHost?.trim();
  if (!host) {
    return undefined;
  }

  const port = env.redisPort?.trim() || '6379';
  const db = env.redisDb?.trim() || '0';
  const password = env.redisPassword
    ? encodeURIComponent(env.redisPassword)
    : undefined;
  const auth = password ? `:${password}@` : '';

  return `redis://${auth}${encodeURIComponent(host)}:${port}/${db}`;
}

/** Resolves the effective cache configuration from the environment. */
export function resolveCacheConfig(env: CacheEnv): ResolvedCacheConfig {
  const ttlMs = resolveCacheTtlMs(env.cacheTtl);

  // Tests must not require a live Redis instance.
  if (env.nodeEnv === 'test') {
    return { mode: 'memory', ttlMs, namespace: CACHE_NAMESPACE };
  }

  const redisUrl = buildRedisUrl(env);
  if (!redisUrl) {
    return { mode: 'memory', ttlMs, namespace: CACHE_NAMESPACE };
  }

  return { mode: 'redis', redisUrl, ttlMs, namespace: CACHE_NAMESPACE };
}

/** Reads the cache-related environment from a Nest `ConfigService`. */
export function cacheEnvFromConfig(config: ConfigService): CacheEnv {
  const get = (key: string): string | undefined =>
    config.get<string>(key) ?? process.env[key] ?? undefined;

  return {
    nodeEnv: get('NODE_ENV'),
    redisUrl: get('REDIS_URL'),
    redisHost: get('REDIS_HOST'),
    redisPort: get('REDIS_PORT'),
    redisPassword: get('REDIS_PASSWORD'),
    redisDb: get('REDIS_DB'),
    cacheTtl: get('CACHE_TTL'),
  };
}

/**
 * Builds the `CacheModule` options for the given environment. The Redis store
 * is only instantiated when Redis is configured; the returned Keyv connects
 * lazily on first use.
 */
export function createCacheModuleOptions(
  env: CacheEnv,
): CacheManagerOptions {
  const resolved = resolveCacheConfig(env);
  const base: CacheManagerOptions = {
    ttl: resolved.ttlMs,
    namespace: resolved.namespace,
  };

  if (resolved.mode === 'memory') {
    return base;
  }

  return {
    ...base,
    stores: [createKeyv(resolved.redisUrl as string)],
  };
}
