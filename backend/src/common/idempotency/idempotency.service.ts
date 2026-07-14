// ── Idempotency Service ──────────────────────────────────────────────────────

import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { IdempotencyConfig, IdempotencyResult } from './idempotency.types';

@Injectable()
export class IdempotencyService implements OnModuleDestroy {
  private readonly logger = new Logger(IdempotencyService.name);
  private readonly redis: Redis;
  private readonly ttlSeconds: number;
  private readonly keyPrefix: string;

  constructor(private readonly configService: ConfigService) {
    this.keyPrefix =
      configService.get('IDEMPOTENCY_KEY_PREFIX') || 'idem';
    this.ttlSeconds = parseInt(
      configService.get('IDEMPOTENCY_TTL_SECONDS') || '86400',
      10,
    );

    this.redis = new Redis({
      host: configService.get('REDIS_HOST') || 'localhost',
      port: parseInt(configService.get('REDIS_PORT') || '6379', 10),
      password: configService.get('REDIS_PASSWORD') || undefined,
      db: parseInt(configService.get('REDIS_DB') || '0', 10),
      lazyConnect: true,
    });

    void this.redis.connect().catch((err: Error) => {
      this.logger.warn(
        `Redis connection failed for idempotency: ${err.message}`,
      );
    });
  }

  onModuleDestroy(): void {
    void this.redis.quit();
  }

  // ── Public API ───────────────────────────────────────────────────────────

  /**
   * Atomically check and set an idempotency key.
   *
   * Returns `isDuplicate: false` if the key didn't exist (first request).
   * Returns `isDuplicate: true` with the original result if the key already
   * exists (duplicate request).
   *
   * @param key - The idempotency key (e.g. a transaction hash or request ID).
   * @param result - The result to cache for this key (only used on first call).
   */
  async checkAndSet(
    key: string,
    result?: string,
  ): Promise<IdempotencyResult> {
    const redisKey = `${this.keyPrefix}:${key}`;

    try {
      // SET NX (only set if not exists) in one atomic command
      const value = result ?? 'processed';
      const setResult = await this.redis.set(
        redisKey,
        value,
        'EX',
        this.ttlSeconds,
        'NX',
      );

      if (setResult === 'OK') {
        // First time — key was set
        return {
          isDuplicate: false,
          createdAt: new Date().toISOString(),
        };
      }

      // Key already exists — duplicate request
      const existingValue = await this.redis.get(redisKey);
      return {
        isDuplicate: true,
        originalResult: existingValue ?? undefined,
        createdAt: undefined,
      };
    } catch (err) {
      this.logger.error(
        `Idempotency check failed for key '${key}': ${(err as Error).message}`,
      );
      // On Redis failure, assume NOT a duplicate (fail open to avoid
      // blocking legitimate requests due to infrastructure issues)
      return { isDuplicate: false };
    }
  }

  /**
   * Check if an idempotency key exists without setting it.
   */
  async exists(key: string): Promise<boolean> {
    const redisKey = `${this.keyPrefix}:${key}`;
    try {
      const result = await this.redis.exists(redisKey);
      return result === 1;
    } catch {
      return false;
    }
  }

  /**
   * Remove an idempotency key (useful for tests or manual resets).
   */
  async remove(key: string): Promise<void> {
    const redisKey = `${this.keyPrefix}:${key}`;
    try {
      await this.redis.del(redisKey);
    } catch (err) {
      this.logger.warn(
        `Failed to remove idempotency key '${key}': ${(err as Error).message}`,
      );
    }
  }

  /**
   * Get the TTL of an idempotency key in seconds.
   * Returns -1 if the key doesn't exist.
   */
  async getTtl(key: string): Promise<number> {
    const redisKey = `${this.keyPrefix}:${key}`;
    try {
      return await this.redis.ttl(redisKey);
    } catch {
      return -1;
    }
  }
}
