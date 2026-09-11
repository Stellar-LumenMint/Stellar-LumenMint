import { clampLimit, clampPage } from './pagination';

describe('pagination helpers', () => {
  describe('clampLimit', () => {
    it('defaults to 20 when missing or invalid', () => {
      expect(clampLimit(undefined)).toBe(20);
      expect(clampLimit(null)).toBe(20);
      expect(clampLimit('abc')).toBe(20);
      expect(clampLimit(Number.NaN)).toBe(20);
    });

    it('caps at the max page size', () => {
      expect(clampLimit(1000000000)).toBe(100);
      expect(clampLimit(101)).toBe(100);
    });

    it('keeps valid sizes and clamps below 1', () => {
      expect(clampLimit(5)).toBe(5);
      expect(clampLimit(0)).toBe(20);
      expect(clampLimit(-3)).toBe(20);
    });
  });

  describe('clampPage', () => {
    it('defaults to 1 when missing or invalid', () => {
      expect(clampPage(undefined)).toBe(1);
      expect(clampPage('abc')).toBe(1);
      expect(clampPage(0)).toBe(1);
      expect(clampPage(-10)).toBe(1);
    });

    it('keeps valid pages', () => {
      expect(clampPage(3)).toBe(3);
      expect(clampPage('7')).toBe(7);
    });
  });
});
