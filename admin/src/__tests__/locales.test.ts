import { describe, it, expect } from 'vitest';
import en from '../locales/en.json';
import es from '../locales/es.json';

function getAllKeys(obj: any, prefix = ''): string[] {
  if (typeof obj !== 'object' || obj === null) return [prefix];
  return Object.entries(obj).flatMap(([k, v]) =>
    getAllKeys(v, prefix ? `${prefix}.${k}` : k),
  );
}

describe('Locale files', () => {
  it('should have matching keys between en and es', () => {
    const enKeys = new Set(getAllKeys(en));
    const esKeys = new Set(getAllKeys(es));

    const missingInEs = [...enKeys].filter(k => !esKeys.has(k));
    const missingInEn = [...esKeys].filter(k => !enKeys.has(k));

    expect(missingInEs).toEqual([]);
    expect(missingInEn).toEqual([]);
  });

  it('should have English translations loaded', () => {
    expect(en).toBeDefined();
    expect(typeof en).toBe('object');
  });

  it('should have Spanish translations loaded', () => {
    expect(es).toBeDefined();
    expect(typeof es).toBe('object');
  });
});
