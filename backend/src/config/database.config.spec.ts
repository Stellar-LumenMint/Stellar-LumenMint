import {
  getSynchronizeSetting,
  isSynchronizeEnabled,
} from './database.config';

describe('database.config', () => {
  describe('isSynchronizeEnabled', () => {
    it('defaults to on for local development', () => {
      expect(isSynchronizeEnabled('development', {})).toBe(true);
    });

    it('defaults to on when NODE_ENV is missing', () => {
      expect(isSynchronizeEnabled(undefined, {})).toBe(true);
    });

    it('defaults to off for production and staging', () => {
      expect(isSynchronizeEnabled('production', {})).toBe(false);
      expect(isSynchronizeEnabled('staging', {})).toBe(false);
      expect(isSynchronizeEnabled('test', {})).toBe(false);
    });

    it('lets DB_SYNCHRONIZE=true override the environment default', () => {
      expect(
        isSynchronizeEnabled('production', { DB_SYNCHRONIZE: 'true' }),
      ).toBe(true);
    });

    it('lets DB_SYNCHRONIZE=false disable it even in development', () => {
      expect(
        isSynchronizeEnabled('development', { DB_SYNCHRONIZE: 'false' }),
      ).toBe(false);
    });
  });

  describe('getSynchronizeSetting', () => {
    it('returns the same value isSynchronizeEnabled computes', () => {
      expect(getSynchronizeSetting('production', {})).toBe(false);
      expect(getSynchronizeSetting('development', {})).toBe(true);
    });
  });
});