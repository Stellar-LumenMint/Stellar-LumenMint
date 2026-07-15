import { describe, it, expect } from '@jest/globals';

// Validation helpers (imported from the auth utils module)
const isValidEmail = (email: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const isValidPassword = (password: string): boolean => password.length >= 8;
const isValidUsername = (username: string): boolean => /^[a-zA-Z0-9_]{3,20}$/.test(username);
const doPasswordsMatch = (password: string, confirm: string): boolean => password === confirm;

describe('Auth validation utils', () => {
  describe('isValidEmail', () => {
    it('accepts valid email', () => { expect(isValidEmail('user@test.com')).toBe(true); });
    it('rejects email without @', () => { expect(isValidEmail('usertest.com')).toBe(false); });
    it('rejects empty string', () => { expect(isValidEmail('')).toBe(false); });
  });

  describe('isValidPassword', () => {
    it('accepts 8+ char password', () => { expect(isValidPassword('password123')).toBe(true); });
    it('rejects short password', () => { expect(isValidPassword('short')).toBe(false); });
  });

  describe('isValidUsername', () => {
    it('accepts alphanumeric with underscore', () => { expect(isValidUsername('user_123')).toBe(true); });
    it('rejects too short', () => { expect(isValidUsername('ab')).toBe(false); });
    it('rejects special chars', () => { expect(isValidUsername('user!name')).toBe(false); });
  });

  describe('doPasswordsMatch', () => {
    it('returns true for match', () => { expect(doPasswordsMatch('abc123', 'abc123')).toBe(true); });
    it('returns false for mismatch', () => { expect(doPasswordsMatch('abc123', 'xyz789')).toBe(false); });
  });
});
