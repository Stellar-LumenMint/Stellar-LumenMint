'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useCallback, useMemo } from 'react';

import { DEFAULT_LOCALE, LOCALE_STORAGE_KEY, SUPPORTED_LOCALES } from '@/lib/i18n/locales';

function readStoredLocale(): Locale | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    return stored && Object.keys(translations).includes(stored) ? (stored as Locale) : null;
  } catch {
    return null;
  }
}

function persistLocale(locale: Locale) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // Ignore storage failures (private mode / quota) — the choice just
    // won't survive a reload.
  }
}

// --- Import translations dynamically ---
import enCommon from '@/locales/en/common.json';
import frCommon from '@/locales/fr/common.json';
import esCommon from '@/locales/es/common.json';
import deCommon from '@/locales/de/common.json';

// Dynamically built translations map. The keys must match the shared
// SUPPORTED_LOCALES list used by the middleware, or a locale can be
// redirected to but have no translations (and vice versa).
const translations = {
  en: { common: enCommon },
  fr: { common: frCommon },
  es: { common: esCommon },
  de: { common: deCommon },
} as const;

export type Locale = keyof typeof translations; // "en" | "fr" | "es" | "de"
export type Namespace = keyof (typeof translations)['en']; // "common"
export interface TranslationOptions {
  count?: number;
  [key: string]: any;
}

// Pluralization rules per locale
const pluralRules: Record<Locale, (count: number) => number> = {
  en: (count) => (count === 1 ? 0 : 1),
  fr: (count) => (count === 0 || count === 1 ? 0 : 1),
  es: (count) => (count === 1 ? 0 : 1),
  de: (count) => (count === 1 ? 0 : 1),
};

// Relative time formatter cache
const relativeTimeFormatters: Record<Locale, Intl.RelativeTimeFormat> = {
  en: new Intl.RelativeTimeFormat('en', { numeric: 'auto' }),
  fr: new Intl.RelativeTimeFormat('fr', { numeric: 'auto' }),
  es: new Intl.RelativeTimeFormat('es', { numeric: 'auto' }),
  de: new Intl.RelativeTimeFormat('de', { numeric: 'auto' }),
};

export function useTranslation() {
  const router = useRouter();
  const pathname = usePathname();

  // --- Determine locale from pathname, falling back to the stored choice ---
  const locale: Locale = useMemo(() => {
    const pathSegments = pathname?.split('/') || [];
    const pathLocale = pathSegments[1];
    if ((SUPPORTED_LOCALES as readonly string[]).includes(pathLocale)) {
      return pathLocale as Locale;
    }
    return readStoredLocale() ?? DEFAULT_LOCALE;
  }, [pathname]);

  // Derived from the shared config so the middleware and this hook always
  // agree on which languages exist.
  const locales = [...SUPPORTED_LOCALES] as Locale[];

  // --- Translation function ---
  const t = useCallback(
    (key: string, options: TranslationOptions = {}): string => {
      const { count, ...interpolationOptions } = options;

      const keys = key.split('.');
      let translation: any = translations[locale].common;

      for (const k of keys) {
        if (translation && typeof translation === 'object' && k in translation) {
          translation = translation[k];
        } else {
          // fallback to English
          let fallback: any = translations.en.common;
          for (const fk of keys) {
            fallback = fallback?.[fk];
            if (!fallback) return key;
          }
          translation = fallback;
          break;
        }
      }

      // Handle pluralization
      if (
        count !== undefined &&
        typeof translation === 'object' &&
        translation.one &&
        translation.other
      ) {
        const index = pluralRules[locale](count);
        translation = index === 0 ? translation.one : translation.other;
      }

      // Interpolation
      if (typeof translation === 'string') {
        return translation.replace(/\{\{(\w+)\}\}/g, (match, key) =>
          interpolationOptions[key] !== undefined ? String(interpolationOptions[key]) : match,
        );
      }
      return typeof translation === 'string' ? translation : key;
    },
    [locale],
  );

  const changeLocale = useCallback(
    (newLocale: Locale) => {
      persistLocale(newLocale);
      const pathSegments = pathname?.split('/') || [];

      if (Object.keys(translations).includes(pathSegments[1])) {
        pathSegments[1] = newLocale;
      } else {
        pathSegments.splice(1, 0, newLocale);
      }

      const newPath = `/${pathSegments.filter(Boolean).join('/')}`;
      router.push(newPath);
    },
    [router, pathname],
  );

  // --- Formatting helpers ---
  const formatNumber = useCallback(
    (value: number, options?: Intl.NumberFormatOptions) =>
      new Intl.NumberFormat(locale, options).format(value),
    [locale],
  );

  const formatCurrency = useCallback(
    (value: number, currency?: string) =>
      new Intl.NumberFormat(locale, {
        style: 'currency',
        currency:
          currency ||
          (locale === 'fr' ? 'EUR' : locale === 'es' ? 'EUR' : locale === 'de' ? 'EUR' : 'USD'),
      }).format(value),
    [locale],
  );

  const formatDate = useCallback(
    (date: Date | string, options?: Intl.DateTimeFormatOptions) =>
      new Intl.DateTimeFormat(locale, options).format(
        typeof date === 'string' ? new Date(date) : date,
      ),
    [locale],
  );

  const formatRelativeTime = useCallback(
    (date: Date | string) => {
      const d = typeof date === 'string' ? new Date(date) : date;
      const now = new Date();
      const diffInSeconds = Math.floor((now.getTime() - d.getTime()) / 1000);
      const f = relativeTimeFormatters[locale];
      if (Math.abs(diffInSeconds) < 60) return f.format(-diffInSeconds, 'second');
      if (Math.abs(diffInSeconds) < 3600)
        return f.format(-Math.floor(diffInSeconds / 60), 'minute');
      if (Math.abs(diffInSeconds) < 86400)
        return f.format(-Math.floor(diffInSeconds / 3600), 'hour');
      if (Math.abs(diffInSeconds) < 2592000)
        return f.format(-Math.floor(diffInSeconds / 86400), 'day');
      if (Math.abs(diffInSeconds) < 31536000)
        return f.format(-Math.floor(diffInSeconds / 2592000), 'month');
      return f.format(-Math.floor(diffInSeconds / 31536000), 'year');
    },
    [locale],
  );

  return useMemo(
    () => ({
      t,
      locale,
      locales,
      changeLocale,
      formatNumber,
      formatCurrency,
      formatDate,
      formatRelativeTime,
    }),
    [
      t,
      locale,
      locales,
      changeLocale,
      formatNumber,
      formatCurrency,
      formatDate,
      formatRelativeTime,
    ],
  );
}
