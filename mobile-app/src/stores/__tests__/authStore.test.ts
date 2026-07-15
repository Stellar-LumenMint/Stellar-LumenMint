import { Keypair } from 'stellar-sdk';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const asyncStorageStore: Record<string, string> = {};

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn((key: string) => Promise.resolve(asyncStorageStore[key] ?? null)),
  setItem: jest.fn((key: string, value: string) => {
    asyncStorageStore[key] = value;
    return Promise.resolve();
  }),
  removeItem: jest.fn((key: string) => {
    delete asyncStorageStore[key];
    return Promise.resolve();
  }),
  mergeItem: jest.fn(),
  clear: jest.fn(() => {
    Object.keys(asyncStorageStore).forEach((k) => delete asyncStorageStore[k]);
    return Promise.resolve();
  }),
  getAllKeys: jest.fn(() => Promise.resolve(Object.keys(asyncStorageStore))),
  multiGet: jest.fn(),
  multiSet: jest.fn(),
  multiRemove: jest.fn(),
}));

const secureStoreData: Record<string, string> = {};

jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn((key: string, value: string) => {
    secureStoreData[key] = value;
    return Promise.resolve();
  }),
  getItemAsync: jest.fn((key: string) => Promise.resolve(secureStoreData[key] ?? null)),
  deleteItemAsync: jest.fn((key: string) => {
    delete secureStoreData[key];
    return Promise.resolve();
  }),
}));

jest.mock('expo-crypto', () => ({
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
  digestStringAsync: jest.fn().mockResolvedValue('mockedhash'),
}));

// Mock auth service
const mockEmailLogin = jest.fn();
const mockEmailRegister = jest.fn();
const mockRefreshToken = jest.fn();

jest.mock('../../services/auth/auth.service', () => ({
  authService: {
    emailLogin: (...args: any[]) => mockEmailLogin(...args),
    emailRegister: (...args: any[]) => mockEmailRegister(...args),
    refreshToken: (...args: any[]) => mockRefreshToken(...args),
  },
}));

// Mock token storage
const mockGetRefreshToken = jest.fn();
const mockClearTokens = jest.fn();

jest.mock('../../services/auth/tokenStorage', () => ({
  tokenStorage: {
    getRefreshToken: () => mockGetRefreshToken(),
    clearTokens: () => mockClearTokens(),
  },
}));

// ── Imports (after mocks) ─────────────────────────────────────────────────────

import { useAuthStore } from '../authStore';
import { Wallet } from '../../services/stellar/types';

// ── Helpers ───────────────────────────────────────────────────────────────────

const mockUser = { id: '1', email: 'a@b.com', username: 'alice' };

const makeWallet = (): Wallet => {
  const kp = Keypair.random();
  return { publicKey: kp.publicKey(), secretKey: kp.secret() };
};

function getStore() {
  return useAuthStore.getState();
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useAuthStore', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      wallet: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
    Object.keys(secureStoreData).forEach((k) => delete secureStoreData[k]);
    Object.keys(asyncStorageStore).forEach((k) => delete asyncStorageStore[k]);
    mockEmailLogin.mockReset();
    mockEmailRegister.mockReset();
    mockRefreshToken.mockReset();
    mockGetRefreshToken.mockReset();
    mockClearTokens.mockReset();
  });

  // ── Initial state ───────────────────────────────────────────────────────────

  describe('initial state', () => {
    it('has the correct default values', () => {
      const { user, wallet, isAuthenticated, isLoading, error } = getStore();
      expect(user).toBeNull();
      expect(wallet).toBeNull();
      expect(isAuthenticated).toBe(false);
      expect(isLoading).toBe(false);
      expect(error).toBeNull();
    });
  });

  // ── Simple setters ──────────────────────────────────────────────────────────

  describe('simple setters', () => {
    it('setUser updates the user field', () => {
      const user = { id: '1', email: 'a@b.com', username: 'alice' };
      getStore().setUser(user);
      expect(getStore().user).toEqual(user);
    });

    it('setUser accepts null', () => {
      getStore().setUser({ id: '1', email: 'a@b.com', username: 'alice' });
      getStore().setUser(null);
      expect(getStore().user).toBeNull();
    });

    it('setWallet updates the wallet field', () => {
      const wallet = makeWallet();
      getStore().setWallet(wallet);
      expect(getStore().wallet).toEqual(wallet);
    });

    it('setWallet accepts null', () => {
      getStore().setWallet(makeWallet());
      getStore().setWallet(null);
      expect(getStore().wallet).toBeNull();
    });

    it('setAuthenticated toggles isAuthenticated', () => {
      getStore().setAuthenticated(true);
      expect(getStore().isAuthenticated).toBe(true);
      getStore().setAuthenticated(false);
      expect(getStore().isAuthenticated).toBe(false);
    });

    it('setLoading toggles isLoading', () => {
      getStore().setLoading(true);
      expect(getStore().isLoading).toBe(true);
      getStore().setLoading(false);
      expect(getStore().isLoading).toBe(false);
    });

    it('setError stores the error message', () => {
      getStore().setError('something went wrong');
      expect(getStore().error).toBe('something went wrong');
    });

    it('clearError resets error to null', () => {
      getStore().setError('oops');
      getStore().clearError();
      expect(getStore().error).toBeNull();
    });
  });

  // ── loginWithWallet ─────────────────────────────────────────────────────────

  describe('loginWithWallet', () => {
    it('sets wallet and isAuthenticated on success', async () => {
      const wallet = makeWallet();
      await getStore().loginWithWallet(wallet);

      const { wallet: storedWallet, isAuthenticated, isLoading, error } = getStore();
      expect(storedWallet).toEqual(wallet);
      expect(isAuthenticated).toBe(true);
      expect(isLoading).toBe(false);
      expect(error).toBeNull();
    });

    it('saves the wallet to secure storage', async () => {
      const SecureStore = require('expo-secure-store');
      const wallet = makeWallet();
      await getStore().loginWithWallet(wallet);
      expect(SecureStore.setItemAsync).toHaveBeenCalled();
    });

    it('sets error when storage fails', async () => {
      const SecureStore = require('expo-secure-store');
      SecureStore.setItemAsync.mockRejectedValueOnce(new Error('storage failure'));

      const wallet = makeWallet();
      await getStore().loginWithWallet(wallet);

      expect(getStore().error).toBe('Failed to save wallet: storage failure');
      expect(getStore().isAuthenticated).toBe(false);
      expect(getStore().isLoading).toBe(false);
    });

    it('does not run if isLoading is true', async () => {
      const SecureStore = require('expo-secure-store');
      SecureStore.setItemAsync.mockClear();
      useAuthStore.setState({ isLoading: true });

      await getStore().loginWithWallet(makeWallet());
      expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
    });
  });

  // ── loginWithEmail ──────────────────────────────────────────────────────────

  describe('loginWithEmail', () => {
    it('calls authService.emailLogin and sets user on success', async () => {
      mockEmailLogin.mockResolvedValueOnce({ user: mockUser, tokens: { accessToken: 'at', refreshToken: 'rt' } });

      await getStore().loginWithEmail('user@example.com', 'password123');

      expect(mockEmailLogin).toHaveBeenCalledWith('user@example.com', 'password123');
      expect(getStore().user).toEqual(mockUser);
      expect(getStore().isAuthenticated).toBe(true);
      expect(getStore().isLoading).toBe(false);
      expect(getStore().error).toBeNull();
    });

    it('saves session flag to SecureStore on success', async () => {
      const SecureStore = require('expo-secure-store');
      mockEmailLogin.mockResolvedValueOnce({ user: mockUser, tokens: { accessToken: 'at', refreshToken: 'rt' } });

      await getStore().loginWithEmail('user@example.com', 'password123');
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('stellar_lumenmint_auth_token', 'true');
    });

    it('sets error and re-throws when authService fails', async () => {
      mockEmailLogin.mockRejectedValueOnce({ message: 'Invalid credentials', statusCode: 401 });

      await expect(
        getStore().loginWithEmail('user@example.com', 'wrongpass'),
      ).rejects.toEqual({ message: 'Invalid credentials', statusCode: 401 });

      expect(getStore().error).toBe('Invalid credentials');
      expect(getStore().isAuthenticated).toBe(false);
      expect(getStore().isLoading).toBe(false);
    });

    it('sets fallback error message when error has no message', async () => {
      mockEmailLogin.mockRejectedValueOnce({});

      await expect(
        getStore().loginWithEmail('user@example.com', 'password123'),
      ).rejects.toEqual({});

      expect(getStore().error).toBe('Email login failed');
      expect(getStore().isLoading).toBe(false);
    });

    it('does not run if isLoading is true', async () => {
      useAuthStore.setState({ isLoading: true });
      await getStore().loginWithEmail('user@example.com', 'password123');
      expect(mockEmailLogin).not.toHaveBeenCalled();
    });
  });

  // ── registerWithEmail ───────────────────────────────────────────────────────

  describe('registerWithEmail', () => {
    it('calls authService.emailRegister and sets user on success', async () => {
      mockEmailRegister.mockResolvedValueOnce({ user: mockUser, tokens: { accessToken: 'at', refreshToken: 'rt' } });

      await getStore().registerWithEmail('user@example.com', 'password123', 'alice');

      expect(mockEmailRegister).toHaveBeenCalledWith('user@example.com', 'password123', 'alice');
      expect(getStore().user).toEqual(mockUser);
      expect(getStore().isAuthenticated).toBe(true);
      expect(getStore().isLoading).toBe(false);
      expect(getStore().error).toBeNull();
    });

    it('saves session flag to SecureStore on success', async () => {
      const SecureStore = require('expo-secure-store');
      mockEmailRegister.mockResolvedValueOnce({ user: mockUser, tokens: { accessToken: 'at', refreshToken: 'rt' } });

      await getStore().registerWithEmail('user@example.com', 'password123', 'alice');
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('stellar_lumenmint_auth_token', 'true');
    });

    it('sets error and re-throws when authService fails', async () => {
      mockEmailRegister.mockRejectedValueOnce({ message: 'Email already taken', statusCode: 409 });

      await expect(
        getStore().registerWithEmail('user@example.com', 'password123', 'alice'),
      ).rejects.toEqual({ message: 'Email already taken', statusCode: 409 });

      expect(getStore().error).toBe('Email already taken');
      expect(getStore().isAuthenticated).toBe(false);
      expect(getStore().isLoading).toBe(false);
    });

    it('sets fallback error message when error has no message', async () => {
      mockEmailRegister.mockRejectedValueOnce(new Error());

      await expect(
        getStore().registerWithEmail('user@example.com', 'password123', 'alice'),
      ).rejects.toThrow();

      expect(getStore().error).toBe('Email registration failed');
      expect(getStore().isLoading).toBe(false);
    });

    it('does not run if isLoading is true', async () => {
      useAuthStore.setState({ isLoading: true });
      await getStore().registerWithEmail('user@example.com', 'password123', 'alice');
      expect(mockEmailRegister).not.toHaveBeenCalled();
    });
  });

  // ── logout ──────────────────────────────────────────────────────────────────

  describe('logout', () => {
    it('clears user, wallet and isAuthenticated', async () => {
      useAuthStore.setState({
        user: { id: '1', email: 'a@b.com', username: 'alice' },
        wallet: makeWallet(),
        isAuthenticated: true,
      });

      await getStore().logout();

      const { user, wallet, isAuthenticated, isLoading } = getStore();
      expect(user).toBeNull();
      expect(wallet).toBeNull();
      expect(isAuthenticated).toBe(false);
      expect(isLoading).toBe(false);
    });

    it('deletes wallet from secure storage', async () => {
      const SecureStore = require('expo-secure-store');
      secureStoreData['stellar_lumenmint_wallet'] = JSON.stringify(makeWallet());

      await getStore().logout();
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('stellar_lumenmint_wallet');
    });

    it('removes auth token from secure storage', async () => {
      const SecureStore = require('expo-secure-store');
      secureStoreData['stellar_lumenmint_auth_token'] = 'true';

      await getStore().logout();
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('stellar_lumenmint_auth_token');
    });

    it('still clears state even when storage throws', async () => {
      const SecureStore = require('expo-secure-store');
      SecureStore.deleteItemAsync.mockRejectedValueOnce(new Error('delete failed'));

      useAuthStore.setState({ isAuthenticated: true, wallet: makeWallet() });
      await getStore().logout();

      expect(getStore().isAuthenticated).toBe(false);
      expect(getStore().wallet).toBeNull();
    });
  });

  // ── checkAuth ───────────────────────────────────────────────────────────────

  describe('checkAuth', () => {
    it('returns false and sets isAuthenticated false when nothing is stored', async () => {
      const result = await getStore().checkAuth();
      expect(result).toBe(false);
      expect(getStore().isAuthenticated).toBe(false);
      expect(getStore().isLoading).toBe(false);
    });

    it('refreshes token and sets user when session flag and refresh token exist', async () => {
      secureStoreData['stellar_lumenmint_auth_token'] = 'true';
      mockGetRefreshToken.mockResolvedValueOnce('valid-refresh-token');
      mockRefreshToken.mockResolvedValueOnce({ user: mockUser, tokens: { accessToken: 'new-at', refreshToken: 'new-rt' } });

      const result = await getStore().checkAuth();
      expect(result).toBe(true);
      expect(getStore().isAuthenticated).toBe(true);
      expect(getStore().user).toEqual(mockUser);
      expect(mockRefreshToken).toHaveBeenCalledWith('valid-refresh-token');
      expect(getStore().isLoading).toBe(false);
    });

    it('clears stale session when flag exists but no refresh token', async () => {
      const SecureStore = require('expo-secure-store');
      secureStoreData['stellar_lumenmint_auth_token'] = 'true';
      mockGetRefreshToken.mockResolvedValueOnce(null);

      const result = await getStore().checkAuth();
      expect(result).toBe(false);
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('stellar_lumenmint_auth_token');
      expect(getStore().isAuthenticated).toBe(false);
    });

    it('clears stale session when token refresh fails', async () => {
      secureStoreData['stellar_lumenmint_auth_token'] = 'true';
      mockGetRefreshToken.mockResolvedValueOnce('expired-token');
      mockRefreshToken.mockRejectedValueOnce(new Error('Token expired'));

      const result = await getStore().checkAuth();
      expect(result).toBe(false);
      expect(mockClearTokens).toHaveBeenCalled();
      expect(getStore().isAuthenticated).toBe(false);
    });

    it('returns true and restores wallet when wallet is stored but no token', async () => {
      const wallet = makeWallet();
      secureStoreData['stellar_lumenmint_wallet'] = JSON.stringify(wallet);

      const result = await getStore().checkAuth();
      expect(result).toBe(true);
      expect(getStore().isAuthenticated).toBe(true);
      expect(getStore().wallet).toEqual(wallet);
      expect(getStore().isLoading).toBe(false);
    });

    it('returns false and sets error when storage throws', async () => {
      const SecureStore = require('expo-secure-store');
      SecureStore.getItemAsync.mockRejectedValueOnce(new Error('read error'));

      const result = await getStore().checkAuth();
      expect(result).toBe(false);
      expect(getStore().isAuthenticated).toBe(false);
      expect(getStore().error).toBeTruthy();
      expect(getStore().isLoading).toBe(false);
    });
  });
});
