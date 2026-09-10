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

    // Parse comma-separated list and trim whitespace
    const origins = corsAllowedOrigins
      .split(',')
      .map((origin) => origin.trim())
      .filter((origin) => origin.length > 0);

    if (origins.length === 0) {
      throw new BadRequestException(
        'CORS_ALLOWED_ORIGINS must contain at least one valid domain in production',
      );
    }

    // Validate each origin is a valid URL
    for (const origin of origins) {
      try {
        const url = new URL(origin);
        // Ensure it's https in production (except localhost for testing)
        if (url.protocol !== 'https:' && !url.hostname.includes('localhost')) {
          throw new BadRequestException(
            `CORS origin ${origin} must use HTTPS in production`,
          );
        }
      } catch {
        throw new BadRequestException(
          `Invalid CORS origin: ${origin}. Must be a valid URL`,
        );
      }
    }

    return origins;
  }

  // Development environment - permissive
  const devOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:5000',
  ];

  if (corsOriginDev && corsOriginDev.trim() !== '') {
    try {
      const customOrigins = corsOriginDev
        .split(',')
        .map((o) => o.trim())
        .filter((o) => o.length > 0);
      devOrigins.push(...customOrigins);
    } catch {
      // Ignore invalid custom origins in dev
    }
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
    exposedHeaders: [
      'Content-Length',
      'X-Content-Type-Options',
      'X-Frame-Options',
      'X-XSS-Protection',
    ],
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
