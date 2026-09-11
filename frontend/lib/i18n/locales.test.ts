import { DEFAULT_LOCALE, SUPPORTED_LOCALES, isSupportedLocale } from './locales';
import enCommon from '@/locales/en/common.json';
import frCommon from '@/locales/fr/common.json';
import esCommon from '@/locales/es/common.json';
import deCommon from '@/locales/de/common.json';

describe('shared i18n locale config', () => {
  it('includes every locale that ships translation files', () => {
    const translationFiles = { en: enCommon, fr: frCommon, es: esCommon, de: deCommon };
    for (const locale of Object.keys(translationFiles)) {
      expect(SUPPORTED_LOCALES).toContain(locale);
    }
  });

  it('has a default locale that is itself supported', () => {
    expect(SUPPORTED_LOCALES).toContain(DEFAULT_LOCALE);
  });

  it('rejects unsupported locale strings', () => {
    expect(isSupportedLocale('en')).toBe(true);
    expect(isSupportedLocale('fr')).toBe(true);
    expect(isSupportedLocale('xx')).toBe(false);
    expect(isSupportedLocale(undefined)).toBe(false);
    expect(isSupportedLocale(null)).toBe(false);
  });
});
