import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  Inject,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Reflector } from '@nestjs/core';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request } from 'express';

export const CACHE_TTL_KEY = 'cache_ttl';
export const CACHE_KEY_PREFIX = 'cache_key_prefix';
export const NO_CACHE_KEY = 'no_cache';

/**
 * Decorator to set cache TTL (in seconds) on an endpoint.
 */
export const CacheTTL = (ttlSeconds: number) =>
  Reflect.metadata(CACHE_TTL_KEY, ttlSeconds);

/**
 * Decorator to skip caching on an endpoint.
 */
export const NoCache = () => Reflect.metadata(NO_CACHE_KEY, true);

/**
 * Decorator to set a custom cache key prefix.
 */
export const CacheKeyPrefix = (prefix: string) =>
  Reflect.metadata(CACHE_KEY_PREFIX, prefix);

/**
 * CacheResponseInterceptor — Automatically caches GET request responses
 * in Redis via the cache-manager abstraction.
 *
 * Usage:
 * - Apply globally or per-controller
 * - Use @CacheTTL(60) to set per-endpoint TTL
 * - Use @NoCache() to skip caching on specific endpoints
 */
@Injectable()
export class CacheResponseInterceptor implements NestInterceptor {
  constructor(
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly reflector: Reflector,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    const request = context.switchToHttp().getRequest<Request>();

    // Only cache GET/HEAD requests
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return next.handle();
    }

    // Check @NoCache() decorator
    const noCache = this.reflector.getAllAndOverride<boolean>(NO_CACHE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (noCache) {
      return next.handle();
    }

    const ttl = this.reflector.getAllAndOverride<number>(CACHE_TTL_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const prefix = this.reflector.getAllAndOverride<string>(CACHE_KEY_PREFIX, [
      context.getHandler(),
      context.getClass(),
    ]);

    const cacheKey = this.buildCacheKey(request, prefix);

    try {
      const cached = await this.cacheManager.get<unknown>(cacheKey);
      if (cached !== undefined && cached !== null) {
        return of(cached);
      }
    } catch {
      // Cache miss or error — proceed to handler
    }

    return next.handle().pipe(
      tap(async (data) => {
        if (data !== undefined && data !== null) {
          try {
            // Default TTL: 30 seconds, overridden by @CacheTTL decorator
            const effectiveTtl = (ttl ?? 30) * 1000; // convert to ms
            await this.cacheManager.set(cacheKey, data, effectiveTtl);
          } catch {
            // Silently fail cache writes
          }
        }
      }),
    );
  }

  private buildCacheKey(request: Request, prefix?: string): string {
    const base = `${request.method}:${request.originalUrl || request.url}`;
    const auth =
      (request.headers['authorization'] as string)?.slice(-12) ?? 'anon';
    return `cache:${prefix ?? 'api'}:${base}:${auth}`;
  }
}
