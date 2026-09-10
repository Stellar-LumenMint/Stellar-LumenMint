import {
  buildRedisUrl,
  createCacheModuleOptions,
  DEFAULT_CACHE_TTL_MS,
  resolveCacheConfig,
  resolveCacheTtlMs,
} from './cache.config';

describe('cache config', () => {
  describe('resolveCacheTtlMs', () => {
    it('treats CACHE_TTL as seconds and converts to milliseconds', () => {
      expect(resolveCacheTtlMs('300')).toBe(300_000);
      expect(resolveCacheTtlMs('1')).toBe(1_000);
    });

    it('falls back to the default for missing or invalid values', () => {
      expect(resolveCacheTtlMs(undefined)).toBe(DEFAULT_CACHE_TTL_MS);
      expect(resolveCacheTtlMs('')).toBe(DEFAULT_CACHE_TTL_MS);
      expect(resolveCacheTtlMs('0')).toBe(DEFAULT_CACHE_TTL_MS);
      expect(resolveCacheTtlMs('-5')).toBe(DEFAULT_CACHE_TTL_MS);
      expect(resolveCacheTtlMs('abc')).toBe(DEFAULT_CACHE_TTL_MS);
    });
  });

  describe('buildRedisUrl', () => {
    it('prefers an explicit REDIS_URL', () => {
      expect(
        buildRedisUrl({
          redisUrl: ' redis://cache.internal:6380/2 ',
          redisHost: 'ignored',
        }),
      ).toBe('redis://cache.internal:6380/2');
    });

    it('assembles a URL from host, port, db and password', () => {
      expect(
        buildRedisUrl({
          redisHost: 'localhost',
          redisPort: '6380',
          redisDb: '3',
          redisPassword: 'p@ss:word',
        }),
      ).toBe('redis://:p%40ss%3Aword@localhost:6380/3');
    });

    it('uses defaults for port/db and returns undefined without a host', () => {
      expect(buildRedisUrl({ redisHost: 'redis' })).toBe(
        'redis://redis:6379/0',
      );
      expect(buildRedisUrl({})).toBeUndefined();
    });
  });

  describe('resolveCacheConfig', () => {
    it('always uses the in-memory cache in tests', () => {
      const resolved = resolveCacheConfig({
        nodeEnv: 'test',
        redisHost: 'localhost',
      });
      expect(resolved.mode).toBe('memory');
      expect(resolved.redisUrl).toBeUndefined();
    });

    it('uses the in-memory cache when Redis is not configured', () => {
      expect(resolveCacheConfig({ nodeEnv: 'production' }).mode).toBe('memory');
    });

    it('uses Redis when configured outside tests', () => {
      const resolved = resolveCacheConfig({
        nodeEnv: 'production',
        redisHost: 'redis',
        cacheTtl: '120',
      });
      expect(resolved.mode).toBe('redis');
      expect(resolved.redisUrl).toBe('redis://redis:6379/0');
      expect(resolved.ttlMs).toBe(120_000);
      expect(resolved.namespace).toBe('lumenmint');
    });
  });

  describe('createCacheModuleOptions', () => {
    it('omits stores for the in-memory cache', () => {
      const options = createCacheModuleOptions({ nodeEnv: 'test' });
      expect(options.stores).toBeUndefined();
      expect(options.ttl).toBe(DEFAULT_CACHE_TTL_MS);
    });

    it('builds a Keyv Redis store when Redis is configured', () => {
      const options = createCacheModuleOptions({
        nodeEnv: 'production',
        redisUrl: 'redis://localhost:6379',
      });
      expect(Array.isArray(options.stores)).toBe(true);
      expect(options.stores).toHaveLength(1);
    });
  });
});
