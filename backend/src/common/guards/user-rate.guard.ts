import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Reflector } from '@nestjs/core';
import type { Request, Response } from 'express';

export const RATE_LIMIT_KEY = 'rate_limit';
export const RATE_LIMIT_TTL_KEY = 'rate_limit_ttl';

export interface RateLimitOptions {
  /** Max requests within the window */
  points: number;
  /** Window duration in seconds */
  duration: number;
}

/**
 * Decorator to set custom rate limit on an endpoint.
 */
export const RateLimit = (points: number, durationSeconds = 60) =>
  Reflect.metadata(RATE_LIMIT_KEY, { points, duration: durationSeconds });

interface RateWindow {
  count: number;
  windowStart: number;
}

/**
 * UserRateGuard — Per-user (or per-IP) rate limiting using Redis.
 *
 * Supports per-endpoint customization via the @RateLimit decorator.
 * Falls back to ip-based limiting when no authenticated user is present.
 */
@Injectable()
export class UserRateGuard implements CanActivate {
  private readonly defaultLimit: RateLimitOptions = {
    points: 100,
    duration: 60,
  };

  // Tiered limits for authenticated users
  private readonly tiers: Record<string, RateLimitOptions> = {
    admin: { points: 500, duration: 60 },
    creator: { points: 200, duration: 60 },
    default: { points: 100, duration: 60 },
  };

  constructor(
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    // Check for per-endpoint @RateLimit override
    const endpointLimit = this.reflector.getAllAndOverride<RateLimitOptions>(
      RATE_LIMIT_KEY,
      [context.getHandler(), context.getClass()],
    );

    const limit = endpointLimit ?? this.getUserLimit(request);
    const key = this.buildKey(request);

    try {
      const now = Date.now();
      const windowDurationMs = limit.duration * 1000;

      const cached = await this.cacheManager.get<RateWindow>(key);

      if (!cached || now - cached.windowStart >= windowDurationMs) {
        // New window — start fresh with count 1
        const window: RateWindow = { count: 1, windowStart: now };
        await this.cacheManager.set(key, window, limit.duration * 1000);

        response.setHeader('X-RateLimit-Limit', String(limit.points));
        response.setHeader('X-RateLimit-Remaining', String(Math.max(0, limit.points - 1)));
        return true;
      }

      const count = cached.count + 1;

      if (count > limit.points) {
        const retryAfter = Math.ceil(
          (cached.windowStart + windowDurationMs - now) / 1000,
        );

        response.setHeader('X-RateLimit-Limit', String(limit.points));
        response.setHeader('X-RateLimit-Remaining', '0');
        response.setHeader('Retry-After', String(retryAfter));

        throw new HttpException(
          'Too Many Requests',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      // Update count, preserve window
      cached.count = count;
      const remainingTtl = Math.max(
        0,
        cached.windowStart + windowDurationMs - now,
      );
      await this.cacheManager.set(key, cached, remainingTtl);

      response.setHeader('X-RateLimit-Limit', String(limit.points));
      response.setHeader(
        'X-RateLimit-Remaining',
        String(Math.max(0, limit.points - count)),
      );

      return true;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      // On cache error, allow the request through
      return true;
    }
  }

  private buildKey(request: Request): string {
    const userId = (request as any).user?.id;
    if (userId) {
      return `rate:user:${userId}:${request.method}:${request.path}`;
    }
    const ip =
      (request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ??
      request.ip ??
      'unknown';
    return `rate:ip:${ip}:${request.method}:${request.path}`;
  }

  private getUserLimit(request: Request): RateLimitOptions {
    const role = (request as any).user?.role as string | undefined;
    if (role && this.tiers[role]) {
      return this.tiers[role];
    }
    return this.tiers.default;
  }

  private async getTtl(key: string): Promise<number | null> {
    try {
      // cache-manager v5+ doesn't expose getTtl directly; use a workaround
      const store = (this.cacheManager as any).store;
      if (typeof store?.ttl === 'function') {
        return store.ttl(key);
      }
      return null;
    } catch {
      return null;
    }
  }
}
