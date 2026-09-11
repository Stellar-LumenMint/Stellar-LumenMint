import { telemetry } from '../client';
import { getTelemetryConfig } from '../config';

describe('Telemetry client init', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    // Force re-init on the next test by resetting the singleton. The
    // initialized flag is private, so re-require fresh module state.
    jest.resetModules();
  });

  it('stays a noop and skips adapter init when telemetry is disabled', async () => {
    process.env.NEXT_PUBLIC_TELEMETRY_ENABLED = 'false';
    process.env.NEXT_PUBLIC_TELEMETRY_PROVIDER = 'posthog';
    const { telemetry: freshTelemetry } = await import('../client');
    // init resolves without throwing even though no SDK is loaded,
    // because the noop path is taken.
    await expect(freshTelemetry.init()).resolves.toBeUndefined();
    expect(getTelemetryConfig().enabled).toBe(false);
  });

  it('selects the noop adapter for an unknown provider', async () => {
    process.env.NEXT_PUBLIC_TELEMETRY_ENABLED = 'true';
    process.env.NEXT_PUBLIC_TELEMETRY_PROVIDER = 'ga4'; // not wired yet
    const { telemetry: freshTelemetry } = await import('../client');
    await freshTelemetry.init();
    // Must not throw; ga4 has no adapter so we fall back to noop.
    expect(() => freshTelemetry.track('test_event', {})).not.toThrow();
  });
});
