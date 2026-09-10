import { getJwtSecret } from './jwt.config';

describe('getJwtSecret', () => {
  it('returns the configured secret when present', () => {
    expect(getJwtSecret('  super-secret  ', { NODE_ENV: 'production' })).toBe(
      'super-secret',
    );
  });

  it('throws in production when JWT_SECRET is missing (fail closed)', () => {
    expect(() =>
      getJwtSecret(undefined, { NODE_ENV: 'production' }),
    ).toThrow(/JWT_SECRET must be set in production/);
  });

  it('throws in production when JWT_SECRET is whitespace-only', () => {
    expect(() => getJwtSecret('   ', { NODE_ENV: 'production' })).toThrow(
      /JWT_SECRET must be set in production/,
    );
  });

  it('falls back to the dev secret outside production', () => {
    expect(getJwtSecret(undefined, { NODE_ENV: 'development' })).toBe(
      'your-secret-key-change-in-production',
    );
    // Defaults to process.env when env not passed
    expect(getJwtSecret(undefined)).toBe('your-secret-key-change-in-production');
  });
});