import { Logger } from '@nestjs/common';

/**
 * Whether TypeORM should synchronize the schema from entities.
 *
 * `synchronize: true` rewrites the schema to match the entities on every
 * boot — fine for throwaway local databases, catastrophic for any shared
 * or production one (silent column drops, type changes, data loss). The
 * repo ships raw-SQL migrations under `backend/migrations/`; those are the
 * source of truth for real environments.
 *
 * Synchronization is therefore opt-in via DB_SYNCHRONIZE=true and defaults
 * to off outside local development. A startup warning is logged whenever it
 * is enabled outside development so it can never silently ride into a
 * staging or production deploy.
 */
export function isSynchronizeEnabled(
  nodeEnv: string | undefined,
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  // Explicit opt-in wins in every environment.
  if (env.DB_SYNCHRONIZE === 'true') {
    return true;
  }
  // Explicit opt-out disables it even in development.
  if (env.DB_SYNCHRONIZE === 'false') {
    return false;
  }
  // Default: only local development may synchronize.
  return !nodeEnv || nodeEnv === 'development';
}

/**
 * Warn once at boot when schema synchronization is active somewhere it
 * should not be. Returns the effective value so callers can pass it
 * straight into the TypeORM config.
 */
export function getSynchronizeSetting(
  nodeEnv: string | undefined,
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  const synchronize = isSynchronizeEnabled(nodeEnv, env);
  const isProdLike = nodeEnv === 'production' || nodeEnv === 'staging';

  if (synchronize && isProdLike) {
    new Logger('Database').warn(
      'TypeORM schema synchronization is ENABLED in a production-like ' +
        'environment. This can drop or alter columns silently. Set ' +
        'DB_SYNCHRONIZE=false and run the migrations in backend/migrations/.',
    );
  }

  return synchronize;
}
