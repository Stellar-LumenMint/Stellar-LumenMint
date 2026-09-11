import { BadRequestException } from '@nestjs/common';
import {
  getAllowedOrigins,
  getWebSocketOrigins,
  validateCorsOrigin,
} from './cors.config';

describe('getWebSocketOrigins', () => {
  it('returns dev localhost origins outside production', () => {
    const origins = getWebSocketOrigins({
      NODE_ENV: 'development',
    });
    expect(origins).toContain('http://localhost:3000');
    expect(origins).toContain('http://127.0.0.1:3000');
    expect(origins).not.toContain('*');
  });

  it('includes CORS_ORIGIN_DEV additions in development', () => {
    const origins = getWebSocketOrigins({
      NODE_ENV: 'development',
      CORS_ORIGIN_DEV: 'http://mydevice.local:8080',
    });
    expect(origins).toContain('http://mydevice.local:8080');
  });

  it('never returns the wildcard origin', () => {
    const origins = getWebSocketOrigins({
      NODE_ENV: 'production',
      CORS_ALLOWED_ORIGINS: 'https://app.stellar-lumenmint.com',
    });
    expect(origins).not.toContain('*');
    expect(origins).toContain('https://app.stellar-lumenmint.com');
  });

  it('fails closed in production when no allowlist is configured', () => {
    expect(() => getWebSocketOrigins({ NODE_ENV: 'production' })).toThrow(
      BadRequestException,
    );
    expect(() =>
      getWebSocketOrigins({
        NODE_ENV: 'production',
        CORS_ALLOWED_ORIGINS: '   ',
      }),
    ).toThrow(BadRequestException);
  });
});

describe('getAllowedOrigins', () => {
  it('returns the dev defaults outside production', () => {
    expect(getAllowedOrigins({ nodeEnv: 'development' })).toEqual([
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:5000',
    ]);
  });

  it('appends validated custom dev origins', () => {
    expect(
      getAllowedOrigins({
        nodeEnv: 'development',
        corsOriginDev: 'https://preview.example.com, http://192.168.1.5:3000',
      }),
    ).toEqual([
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:5000',
      'https://preview.example.com',
      'http://192.168.1.5:3000',
    ]);
  });

  it('rejects an invalid custom dev origin instead of ignoring it', () => {
    expect(() =>
      getAllowedOrigins({
        nodeEnv: 'development',
        corsOriginDev: 'not-a-url',
      }),
    ).toThrow(BadRequestException);
  });

  it('requires an allowlist in production', () => {
    expect(() => getAllowedOrigins({ nodeEnv: 'production' })).toThrow(
      BadRequestException,
    );
    expect(() =>
      getAllowedOrigins({ nodeEnv: 'production', corsAllowedOrigins: '  ' }),
    ).toThrow(BadRequestException);
  });

  it('accepts https and loopback origins in production', () => {
    expect(
      getAllowedOrigins({
        nodeEnv: 'production',
        corsAllowedOrigins:
          'https://app.stellar-lumenmint.com,http://localhost:3000',
      }),
    ).toEqual(['https://app.stellar-lumenmint.com', 'http://localhost:3000']);
  });
});

describe('validateCorsOrigin', () => {
  it('accepts plain https origins', () => {
    expect(() =>
      validateCorsOrigin('https://app.stellar-lumenmint.com', true),
    ).not.toThrow();
  });

  it('accepts subdomain wildcards', () => {
    expect(() =>
      validateCorsOrigin('*.stellar-lumenmint.com', true),
    ).not.toThrow();
  });

  it('rejects the bare wildcard origin', () => {
    expect(() => validateCorsOrigin('*', true)).toThrow(BadRequestException);
  });

  it('rejects origins that carry a path', () => {
    expect(() =>
      validateCorsOrigin('https://app.stellar-lumenmint.com/marketplace', true),
    ).toThrow(BadRequestException);
  });

  it('rejects plain http outside loopback when https is required', () => {
    expect(() =>
      validateCorsOrigin('http://app.stellar-lumenmint.com', true),
    ).toThrow(/HTTPS/);
    expect(() =>
      validateCorsOrigin('http://localhost:3000', true),
    ).not.toThrow();
  });

  it('rejects malformed origins and non-http protocols', () => {
    expect(() => validateCorsOrigin('not-a-url', false)).toThrow(
      BadRequestException,
    );
    expect(() => validateCorsOrigin('ftp://example.com', false)).toThrow(
      BadRequestException,
    );
  });
});
