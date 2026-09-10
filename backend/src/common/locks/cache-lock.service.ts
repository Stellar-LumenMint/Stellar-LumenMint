import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import Redis from 'ioredis';

/**
 * Atomically releases a lock only if this caller still owns it. Without the
 * token check a holder whose lease had already expired could delete a lock
 * that a different worker had since acquired.
 */
const RELEASE_SCRIPT = `
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("del", KEYS[1])
end
return 0
`;

/**
 * Small Redis-backed distributed lock.
 *
 * Scheduled jobs run on every application instance, so an unguarded cron does
 * the same work N times and can race with itself. This service provides an
 * atomic `SET key token PX ttl NX` lease so only one instance performs the
 * work while the others skip. It backs jobs that are useful-but-not-critical;
 * if Redis is unreachable the lock fails open (the job runs) because skipping
 * scheduled work is worse than doing it twice.
 */
@Injectable()
export class CacheLockService implements OnModuleDestroy {
  private readonly logger = new Logger(CacheLockService.name);
  private readonly redis: Redis;
  private readonly prefix: string;

  constructor(configService: ConfigService) {
    this.prefix = configService.get('LOCK_KEY_PREFIX') || 'lock';

    this.redis = new Redis({
      host: configService.get('REDIS_HOST') || 'localhost',
      port: parseInt(configService.get('REDIS_PORT') || '6379', 10),
      password: configService.get('REDIS_PASSWORD') || undefined,
      db: parseInt(configService.get('REDIS_DB') || '0', 10),
      lazyConnect: true,
    });

    void this.redis.connect().catch((err: Error) => {
      this.logger.warn(`Redis connection failed for locks: ${err.message}`);
    });
  }

  onModuleDestroy(): void {
    void this.redis.quit();
  }

  /**
   * Attempts to acquire `key` for `ttlMs`. Returns the ownership token on
   * success and `null` when another holder owns the lock. On a Redis error the
   * lock fails open and a token is returned so the caller still runs.
   */
  async acquire(key: string, ttlMs: number): Promise<string | null> {
    if (!Number.isFinite(ttlMs) || ttlMs <= 0) {
      throw new Error('Lock TTL must be a positive number of milliseconds');
    }

    const token = randomUUID();

    try {
      const result = await this.redis.set(
        this.redisKey(key),
        token,
        'PX',
        Math.floor(ttlMs),
        'NX',
      );
      return result === 'OK' ? token : null;
    } catch (error) {
      this.logger.warn(
        `Lock acquire failed for ${key}: ${(error as Error).message}. Proceeding without a distributed lock.`,
      );
      // Fail open: return a token so the caller runs. Release is a no-op in
      // this case because the token is not stored under the key.
      return token;
    }
  }

  /** Releases the lock, but only if this token still owns it. */
  async release(key: string, token: string): Promise<void> {
    try {
      await this.redis.eval(RELEASE_SCRIPT, 1, this.redisKey(key), token);
    } catch (error) {
      this.logger.warn(
        `Lock release failed for ${key}: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Runs `fn` while holding `key`, returning `undefined` when the lock is held
   * elsewhere. The lock is always released, even when `fn` throws.
   */
  async withLock<T>(
    key: string,
    ttlMs: number,
    fn: () => Promise<T>,
  ): Promise<T | undefined> {
    const token = await this.acquire(key, ttlMs);
    if (token === null) {
      return undefined;
    }

    try {
      return await fn();
    } finally {
      await this.release(key, token);
    }
  }

  private redisKey(key: string): string {
    return `${this.prefix}:${key}`;
  }
}
