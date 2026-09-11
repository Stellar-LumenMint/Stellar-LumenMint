// Single source of truth for the app's supported locales.
//
// The middleware previously hardcoded its own locale list, so adding or
// removing a language required editing two places that could drift apart.
// Both middleware.ts and hooks/useTranslation.ts import from here.

export const SUPPORTED_LOCALES = ['en', 'fr', 'es', 'de'] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: SupportedLocale = 'en';

export const LOCALE_STORAGE_KEY = 'stellar-lumenmint:locale';

export function isSupportedLocale(value: string | undefined | null): value is SupportedLocale {
  return !!value && (SUPPORTED_LOCALES as readonly string[]).includes(value);
}
