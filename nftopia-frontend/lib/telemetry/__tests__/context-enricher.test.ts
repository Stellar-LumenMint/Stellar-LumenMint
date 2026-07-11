import { enrichTelemetryPayload } from '../context/enricher';
import { resolveRoute, resolveLocale } from '../context/resolvers';
import { resolveSessionId } from '../context/session';
import { resolveDeviceType } from '../context/device';
import { resolveAppSurface } from '../context/surface';
import { TelemetrySharedContext } from '../context/types';

describe('Telemetry Context Enrichment Pipeline', () => {
  it('enriches payload with all context fields', () => {
    const payload = { foo: 'bar' };
    const enriched = enrichTelemetryPayload(payload);
    expect(enriched).toHaveProperty('context');
    expect(enriched).toHaveProperty('payload');
    const ctx = enriched.context;
    expect(typeof ctx.timestamp).toBe('string');
    expect(typeof ctx.route).toBe('string');
    expect(typeof ctx.locale).toBe('string');
    expect(typeof ctx.session_id).toBe('string');
    expect(['mobile','tablet','desktop','unknown']).toContain(ctx.device_type);
    expect(['landing','auth','creator_dashboard','marketplace','profile','settings','unknown']).toContain(ctx.app_surface);
  });

  it('applies override fields', () => {
    const payload = { foo: 1 };
    const enriched = enrichTelemetryPayload(payload, { locale: 'fr', app_surface: 'profile' });
    expect(enriched.context.locale).toBe('fr');
    expect(enriched.context.app_surface).toBe('profile');
  });

  it('does not mutate original payload', () => {
    const payload = { a: 1 };
    const copy = { ...payload };
    enrichTelemetryPayload(payload);
    expect(payload).toEqual(copy);
  });

  it('returns safe defaults in SSR', () => {
    const enriched = enrichTelemetryPayload({}, undefined, true);
    expect(enriched.context.route).toBe('unknown');
    expect(enriched.context.device_type).toBe('unknown');
  });
});

describe('Context Resolvers', () => {
  it('route resolver strips query/hash and normalizes', () => {
    expect(resolveRoute('/foo/bar?baz=1#hash')).toBe('/foo/bar');
    expect(resolveRoute('/foo/bar/')).toBe('/foo/bar');
    expect(resolveRoute('/')).toBe('/');
  });

  it('locale resolver extracts from route or falls back', () => {
    expect(resolveLocale('/fr/marketplace')).toBe('fr');
    expect(resolveLocale('/en/')).toBe('en');
    expect(resolveLocale('/foo')).toBe('en');
    expect(resolveLocale(undefined, 'es')).toBe('es');
  });

  it('session resolver returns stable id', () => {
    const id1 = resolveSessionId();
    const id2 = resolveSessionId();
    expect(id1).toBe(id2);
    expect(typeof id1).toBe('string');
  });

  it('device resolver returns known type', () => {
    const type = resolveDeviceType();
    expect(['mobile','tablet','desktop','unknown']).toContain(type);
  });

  it('app surface resolver maps routes', () => {
    expect(resolveAppSurface('/en/auth/login')).toBe('auth');
    expect(resolveAppSurface('/fr/creator-dashboard')).toBe('creator_dashboard');
    expect(resolveAppSurface('/marketplace')).toBe('marketplace');
    expect(resolveAppSurface('/profile')).toBe('profile');
    expect(resolveAppSurface('/settings')).toBe('settings');
    expect(resolveAppSurface('/')).toBe('landing');
    expect(resolveAppSurface('/random')).toBe('unknown');
  });
});
