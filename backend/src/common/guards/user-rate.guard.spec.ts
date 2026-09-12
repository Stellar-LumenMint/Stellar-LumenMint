import { Reflector } from '@nestjs/core';
import type { Cache } from 'cache-manager';
import { UserRateGuard } from './user-rate.guard';

const buildKey = (guard: UserRateGuard, request: unknown): string =>
  (guard as unknown as { buildKey: (req: unknown) => string }).buildKey(
    request,
  );

describe('UserRateGuard', () => {
  let guard: UserRateGuard;

  beforeEach(() => {
    guard = new UserRateGuard({} as Cache, new Reflector());
  });

  it('keys an authenticated request by user id', () => {
    const key = buildKey(guard, {
      user: { id: 'user-1' },
      method: 'POST',
      path: '/listings',
      ip: '1.1.1.1',
    });

    expect(key).toBe('rate:user:user-1:POST:/listings');
  });

  // A directly-reachable client could previously pick its own bucket by
  // varying this header, because the guard read it instead of `req.ip`.
  it('ignores a spoofed x-forwarded-for header for anonymous requests', () => {
    const base = { method: 'GET', path: '/marketplace', ip: '1.1.1.1' };

    const first = buildKey(guard, {
      ...base,
      headers: { 'x-forwarded-for': '9.9.9.9' },
    });
    const second = buildKey(guard, {
      ...base,
      headers: { 'x-forwarded-for': '8.8.8.8' },
    });

    expect(first).toBe(second);
    expect(first).toBe('rate:ip:1.1.1.1:GET:/marketplace');
  });

  it('falls back to a stable key when no address is available', () => {
    expect(buildKey(guard, { method: 'GET', path: '/health' })).toBe(
      'rate:ip:unknown:GET:/health',
    );
  });
});
