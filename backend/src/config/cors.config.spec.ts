import { BadRequestException } from '@nestjs/common';
import { getWebSocketOrigins } from './cors.config';

describe('getWebSocketOrigins', () => {
  it('returns dev localhost origins outside production', () => {
    const origins = getWebSocketOrigins({ NODE_ENV: 'development' } as NodeJS.ProcessEnv);
    expect(origins).toContain('http://localhost:3000');
    expect(origins).toContain('http://127.0.0.1:3000');
    expect(origins).not.toContain('*');
  });

  it('includes CORS_ORIGIN_DEV additions in development', () => {
    const origins = getWebSocketOrigins({
      NODE_ENV: 'development',
      CORS_ORIGIN_DEV: 'http://mydevice.local:8080',
    } as NodeJS.ProcessEnv);
    expect(origins).toContain('http://mydevice.local:8080');
  });

  it('never returns the wildcard origin', () => {
    const origins = getWebSocketOrigins({
      NODE_ENV: 'production',
      CORS_ALLOWED_ORIGINS: 'https://app.stellar-lumenmint.com',
    } as NodeJS.ProcessEnv);
    expect(origins).not.toContain('*');
    expect(origins).toContain('https://app.stellar-lumenmint.com');
  });

  it('fails closed in production when no allowlist is configured', () => {
    expect(() =>
      getWebSocketOrigins({ NODE_ENV: 'production' } as NodeJS.ProcessEnv),
    ).toThrow(BadRequestException);
    expect(() =>
      getWebSocketOrigins({
        NODE_ENV: 'production',
        CORS_ALLOWED_ORIGINS: '   ',
      } as NodeJS.ProcessEnv),
    ).toThrow(BadRequestException);
  });
});