import { describe, it, expect, beforeEach, vi } from 'vitest';
import i18next from 'i18next';

// We import after mocking
describe('Admin i18n', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('initializes with English as default language', async () => {
    const { default: i18n } = await import('../i18n');
    expect(i18n.language).toBe('en');
  });

  it('has English and Spanish resources loaded', async () => {
    const { default: i18n } = await import('../i18n');
    expect(i18n.getResource('en', 'translation', 'onboarding.welcome')).toBeDefined();
    expect(i18n.getResource('es', 'translation', 'onboarding.welcome')).toBeDefined();
  });

  it('has fallback language set to English', async () => {
    const { default: i18n } = await import('../i18n');
    const options = i18n.options;
    expect(options.fallbackLng).toContain('en');
  });

  it('does not escape interpolation values', async () => {
    const { default: i18n } = await import('../i18n');
    const options = i18n.options;
    expect(options.interpolation?.escapeValue).toBe(false);
  });
});
