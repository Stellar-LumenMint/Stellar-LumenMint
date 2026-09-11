import { Logger } from '@nestjs/common';

/**
 * The development-only fallback secret. Publicly known — never acceptable
 * for anything other than local development.
 */
const DEV_FALLBACK_SECRET = 'your-secret-key-change-in-production';

/**
 * Resolve the JWT signing/verification secret.
 *
 * Fail-closed: in production a missing JWT_SECRET aborts startup instead of
 * silently falling back to a publicly-known default that would let anyone
 * forge authentication or websocket tokens. Outside production the dev
 * fallback is kept for local convenience, with a warning.
 *
 * @param configuredValue - Value already resolved from ConfigService/process.env
 * @param env            - Environment to inspect for NODE_ENV (defaults to process.env)
 */
export function getJwtSecret(
  configuredValue?: string,
  env: NodeJS.ProcessEnv = process.env,
  logger?: Logger,
): string {
  const secret = configuredValue?.trim();
  if (secret) {
    return secret;
  }

  if (env.NODE_ENV === 'production') {
    throw new Error(
      'JWT_SECRET must be set in production — refusing to start with a known default secret.',
    );
  }

  if (logger) {
    logger.warn(
      'JWT_SECRET is not set; using the development fallback secret. Set it before deploying.',
    );
  }
  return DEV_FALLBACK_SECRET;
}
