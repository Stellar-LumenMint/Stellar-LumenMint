import { BadRequestException, Logger } from '@nestjs/common';

export interface CorsConfig {
  origins: string[];
  credentials: boolean;
  methods: string[];
  allowedHeaders: string[];
  exposedHeaders: string[];
  maxAge: number;
}

export interface CorsEnvironment {
  nodeEnv: string;
  corsAllowedOrigins?: string;
  corsOriginDev?: string;
}

const DEFAULT_DEV_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5000',
];

const SUBDOMAIN_WILDCARD_PREFIX = '*.';

/** Split a comma-separated origin list into trimmed, non-empty entries. */
function parseOrigins(raw: string): string[] {
  return raw
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

/**
 * Validate a single allowed-origin entry.
 *
 * Accepts an absolute http(s) origin, or a `*.example.com` subdomain
 * wildcard (which is not a valid URL, so it is handled before the URL
 * parse). Paths, queries, and fragments are rejected because a browser's
 * Origin header never carries them, so such an entry can never match.
 */
export function validateCorsOrigin(
  origin: string,
  requireHttps: boolean,
): void {
  if (origin === '*') {
    throw new BadRequestException(
      'Wildcard "*" is not a valid CORS origin; list explicit origins',
    );
  }

  if (origin.startsWith(SUBDOMAIN_WILDCARD_PREFIX)) {
    const domain = origin.slice(SUBDOMAIN_WILDCARD_PREFIX.length);
    if (!domain || domain.includes('/') || domain.includes(':')) {
      throw new BadRequestException(`Invalid CORS origin wildcard: ${origin}`);
    }
    return;
  }

  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    throw new BadRequestException(
      `Invalid CORS origin: ${origin}. Must be an absolute URL`,
    );
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new BadRequestException(
      `Invalid CORS origin: ${origin}. Must use http or https`,
    );
  }

  if (url.pathname !== '/' || url.search || url.hash) {
    throw new BadRequestException(
      `Invalid CORS origin: ${origin}. Must not include a path, query, or fragment`,
    );
  }

  const isLoopback =
    url.hostname === 'localhost' || url.hostname === '127.0.0.1';

  if (requireHttps && url.protocol !== 'https:' && !isLoopback) {
    throw new BadRequestException(
      `CORS origin ${origin} must use HTTPS in production`,
    );
  }
}

/**
 * Get the list of allowed origins based on environment
 */
export function getAllowedOrigins(env: CorsEnvironment): string[] {
  const { nodeEnv, corsAllowedOrigins, corsOriginDev } = env;

  // Production environment - strict allowlist required
  if (nodeEnv === 'production') {
    if (!corsAllowedOrigins || corsAllowedOrigins.trim() === '') {
      throw new BadRequestException(
        'CORS_ALLOWED_ORIGINS must be defined and non-empty in production',
      );
    }

    const origins = parseOrigins(corsAllowedOrigins);

    if (origins.length === 0) {
      throw new BadRequestException(
        'CORS_ALLOWED_ORIGINS must contain at least one valid domain in production',
      );
    }

    // Validate every entry up front. Throwing here (rather than swallowing
    // the error) means a typo surfaces at boot instead of silently dropping
    // an origin and breaking a client in production.
    for (const origin of origins) {
      validateCorsOrigin(origin, true);
    }

    return origins;
  }

  // Development environment - permissive defaults plus opt-in extras
  const devOrigins = [...DEFAULT_DEV_ORIGINS];

  if (corsOriginDev && corsOriginDev.trim() !== '') {
    const customOrigins = parseOrigins(corsOriginDev);
    for (const origin of customOrigins) {
      validateCorsOrigin(origin, false);
    }
    devOrigins.push(...customOrigins);
  }

  return devOrigins;
}

/**
 * Create CORS configuration for the application
 */
export function createCorsConfig(env: CorsEnvironment): CorsConfig {
  const origins = getAllowedOrigins(env);

  const logger = new Logger('CorsConfig');
  logger.log(`CORS allowed origins: ${origins.join(', ')}`);

  return {
    origins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'Origin',
      'X-Requested-With',
      'X-API-Key',
      'X-CSRF-Token',
      'Cache-Control',
      'Pragma',
    ],
    // Only headers the browser actually needs to read via JavaScript.
    // X-Content-Type-Options / X-Frame-Options are security response
    // headers set by the server; exposing them to CORS adds attack surface
    // and tells clients nothing they can act on.
    exposedHeaders: ['Content-Length'],
    maxAge: 86400, // 24 hours
  };
}

const DEV_WS_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5000',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  'http://127.0.0.1:5000',
];

/**
 * Origins allowed to open Socket.IO connections.
 *
 * Fail-closed: in production this requires CORS_ALLOWED_ORIGINS to be set
 * (same allowlist as the REST API). It never falls back to the wildcard
 * `*` — wildcard origins are rejected by browsers for credentialed
 * requests, so the previous `CORS_ORIGIN ?? '*'` default silently broke
 * auth'd websockets in production and allowed any origin in dev.
 */
export function getWebSocketOrigins(
  env: NodeJS.ProcessEnv = process.env,
): string[] {
  const nodeEnv = env.NODE_ENV;

  if (nodeEnv === 'production') {
    if (!env.CORS_ALLOWED_ORIGINS || env.CORS_ALLOWED_ORIGINS.trim() === '') {
      throw new BadRequestException(
        'CORS_ALLOWED_ORIGINS must be defined and non-empty in production for websocket gateways',
      );
    }
    return getAllowedOrigins({
      nodeEnv,
      corsAllowedOrigins: env.CORS_ALLOWED_ORIGINS,
      corsOriginDev: env.CORS_ORIGIN_DEV,
    });
  }

  const devOrigins = [...DEV_WS_ORIGINS];
  if (env.CORS_ORIGIN_DEV && env.CORS_ORIGIN_DEV.trim() !== '') {
    devOrigins.push(
      ...env.CORS_ORIGIN_DEV.split(',')
        .map((o) => o.trim())
        .filter((o) => o.length > 0),
    );
  }
  return devOrigins;
}

/**
 * Log rejected origins for security auditing
 */
export function logRejectedOrigin(
  origin: string | undefined,
  path: string,
): void {
  const logger = new Logger('CorsSecurity');
  if (origin) {
    logger.warn(
      `Rejected CORS request from origin: ${origin}, path: ${path}, timestamp: ${new Date().toISOString()}`,
    );
  } else {
    logger.warn(
      `Rejected CORS request with no origin header, path: ${path}, timestamp: ${new Date().toISOString()}`,
    );
  }
}
