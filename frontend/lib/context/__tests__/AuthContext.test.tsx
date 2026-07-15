import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { AuthProvider, useAuthContext, WalletChallenge } from '../AuthContext';

// ── Mock the auth store ──────────────────────────────────────────────────────

const mockEmailLogin = jest.fn();
const mockRegister = jest.fn();
const mockGetWalletChallenge = jest.fn();
const mockVerifyWalletSignature = jest.fn();
const mockLinkWallet = jest.fn();
const mockUnlinkWallet = jest.fn();
const mockListWallets = jest.fn();
const mockLogout = jest.fn();

jest.mock('../../stores/auth-store', () => ({
  useAuthStore: () => ({
    user: null,
    isAuthenticated: false,
    loading: false,
    emailLogin: mockEmailLogin,
    register: mockRegister,
    getWalletChallenge: mockGetWalletChallenge,
    verifyWalletSignature: mockVerifyWalletSignature,
    linkWallet: mockLinkWallet,
    unlinkWallet: mockUnlinkWallet,
    listWallets: mockListWallets,
    logout: mockLogout,
  }),
}));

// ── Helper: render inside AuthProvider ────────────────────────────────────────

function renderAuthContext() {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthProvider>{children}</AuthProvider>
  );
  return renderHook(() => useAuthContext(), { wrapper });
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockListWallets.mockResolvedValue([]);
  });

  // ── Initial state ──────────────────────────────────────────────────────────

  describe('initial state', () => {
    it('provides default null user and not authenticated', () => {
      const { result } = renderAuthContext();
      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isLoading).toBe(false);
    });

    it('provides empty wallets array', () => {
      const { result } = renderAuthContext();
      expect(result.current.wallets).toEqual([]);
    });
  });

  // ── loginWithEmail ─────────────────────────────────────────────────────────

  describe('loginWithEmail', () => {
    it('calls authStore.emailLogin with email and password', async () => {
      mockEmailLogin.mockResolvedValueOnce(undefined);
      const { result } = renderAuthContext();

      await act(async () => {
        await result.current.loginWithEmail('user@test.com', 'password123');
      });

      expect(mockEmailLogin).toHaveBeenCalledWith('user@test.com', 'password123');
    });

    it('propagates errors from the auth store', async () => {
      mockEmailLogin.mockRejectedValueOnce(new Error('Invalid credentials'));
      const { result } = renderAuthContext();

      await act(async () => {
        await expect(
          result.current.loginWithEmail('user@test.com', 'wrong'),
        ).rejects.toThrow('Invalid credentials');
      });
    });
  });

  // ── loginWithWallet (challenge flow) ────────────────────────────────────────

  describe('loginWithWallet', () => {
    const mockChallenge: WalletChallenge = {
      sessionId: 'session-abc',
      walletAddress: 'GBX...',
      nonce: 'nonce-123',
      message: 'Sign this to login: nonce-123',
      expiresAt: '2026-07-15T12:00:00Z',
    };

    it('returns a wallet challenge without throwing', async () => {
      mockGetWalletChallenge.mockResolvedValueOnce(mockChallenge);
      const { result } = renderAuthContext();

      let challenge: WalletChallenge | undefined;
      await act(async () => {
        challenge = await result.current.loginWithWallet('GBX...', 'freighter');
      });

      expect(challenge).toEqual(mockChallenge);
      expect(mockGetWalletChallenge).toHaveBeenCalledWith('GBX...', 'freighter');
    });

    it('passes walletProvider as undefined when not provided', async () => {
      mockGetWalletChallenge.mockResolvedValueOnce(mockChallenge);
      const { result } = renderAuthContext();

      await act(async () => {
        await result.current.loginWithWallet('GBX...');
      });

      expect(mockGetWalletChallenge).toHaveBeenCalledWith('GBX...', undefined);
    });

    it('propagates errors from getWalletChallenge', async () => {
      mockGetWalletChallenge.mockRejectedValueOnce(new Error('Network error'));
      const { result } = renderAuthContext();

      await act(async () => {
        await expect(
          result.current.loginWithWallet('GBX...'),
        ).rejects.toThrow('Network error');
      });
    });
  });

  // ── verifyWalletLogin ──────────────────────────────────────────────────────

  describe('verifyWalletLogin', () => {
    it('calls verifyWalletSignature with all parameters', async () => {
      mockVerifyWalletSignature.mockResolvedValueOnce(undefined);
      const { result } = renderAuthContext();

      await act(async () => {
        await result.current.verifyWalletLogin(
          'GBX...',
          'nonce-123',
          'sig-abc',
          'freighter',
        );
      });

      expect(mockVerifyWalletSignature).toHaveBeenCalledWith(
        'GBX...',
        'nonce-123',
        'sig-abc',
        'freighter',
      );
    });

    it('propagates verification errors', async () => {
      mockVerifyWalletSignature.mockRejectedValueOnce(new Error('Invalid signature'));
      const { result } = renderAuthContext();

      await act(async () => {
        await expect(
          result.current.verifyWalletLogin('GBX...', 'nonce', 'bad-sig'),
        ).rejects.toThrow('Invalid signature');
      });
    });
  });

  // ── register ───────────────────────────────────────────────────────────────

  describe('register', () => {
    it('calls authStore.register with email, password, and username', async () => {
      mockRegister.mockResolvedValueOnce(undefined);
      const { result } = renderAuthContext();

      await act(async () => {
        await result.current.register('new@test.com', 'pass123', 'newuser');
      });

      expect(mockRegister).toHaveBeenCalledWith('new@test.com', 'pass123', 'newuser');
    });

    it('works without username', async () => {
      mockRegister.mockResolvedValueOnce(undefined);
      const { result } = renderAuthContext();

      await act(async () => {
        await result.current.register('new@test.com', 'pass123');
      });

      expect(mockRegister).toHaveBeenCalledWith('new@test.com', 'pass123', undefined);
    });
  });

  // ── linkWallet (challenge flow) ────────────────────────────────────────────

  describe('linkWallet', () => {
    const mockChallenge: WalletChallenge = {
      sessionId: 'session-link',
      walletAddress: 'GBY...',
      nonce: 'nonce-link',
      message: 'Sign to link wallet: nonce-link',
      expiresAt: '2026-07-15T12:00:00Z',
    };

    it('returns a wallet challenge for linking', async () => {
      mockGetWalletChallenge.mockResolvedValueOnce(mockChallenge);
      const { result } = renderAuthContext();

      let challenge: WalletChallenge | undefined;
      await act(async () => {
        challenge = await result.current.linkWallet('GBY...', 'albedo');
      });

      expect(challenge).toEqual(mockChallenge);
      expect(mockGetWalletChallenge).toHaveBeenCalledWith('GBY...', 'albedo');
    });

    it('propagates challenge errors', async () => {
      mockGetWalletChallenge.mockRejectedValueOnce(new Error('Already linked'));
      const { result } = renderAuthContext();

      await act(async () => {
        await expect(
          result.current.linkWallet('GBY...'),
        ).rejects.toThrow('Already linked');
      });
    });
  });

  // ── verifyWalletLink ───────────────────────────────────────────────────────

  describe('verifyWalletLink', () => {
    it('calls linkWallet on store and refreshes wallet list', async () => {
      mockLinkWallet.mockResolvedValueOnce({ success: true });
      mockListWallets.mockResolvedValueOnce([
        { id: 'w1', userId: 'u1', walletAddress: 'GBY...', walletProvider: 'albedo', isPrimary: true },
      ]);
      const { result } = renderAuthContext();

      await act(async () => {
        await result.current.verifyWalletLink('GBY...', 'nonce-link', 'sig-link', 'albedo');
      });

      expect(mockLinkWallet).toHaveBeenCalledWith('GBY...', 'nonce-link', 'sig-link', 'albedo');
      expect(mockListWallets).toHaveBeenCalled();

      await waitFor(() => {
        expect(result.current.wallets).toHaveLength(1);
        expect(result.current.wallets[0].walletAddress).toBe('GBY...');
      });
    });

    it('sets empty wallets on link failure', async () => {
      mockLinkWallet.mockRejectedValueOnce(new Error('Link failed'));
      const { result } = renderAuthContext();

      await act(async () => {
        await expect(
          result.current.verifyWalletLink('GBY...', 'nonce', 'sig'),
        ).rejects.toThrow('Link failed');
      });

      // Wallets should remain empty
      expect(result.current.wallets).toEqual([]);
    });
  });

  // ── unlinkWallet ───────────────────────────────────────────────────────────

  describe('unlinkWallet', () => {
    it('calls unlinkWallet on store and refreshes wallet list', async () => {
      mockUnlinkWallet.mockResolvedValueOnce(undefined);
      mockListWallets.mockResolvedValueOnce([]);
      const { result } = renderAuthContext();

      await act(async () => {
        await result.current.unlinkWallet('GBY...');
      });

      expect(mockUnlinkWallet).toHaveBeenCalledWith('GBY...');
      expect(mockListWallets).toHaveBeenCalled();
    });

    it('propagates unlink errors', async () => {
      mockUnlinkWallet.mockRejectedValueOnce(new Error('Cannot unlink primary'));
      const { result } = renderAuthContext();

      await act(async () => {
        await expect(
          result.current.unlinkWallet('GBY...'),
        ).rejects.toThrow('Cannot unlink primary');
      });
    });
  });

  // ── logout ─────────────────────────────────────────────────────────────────

  describe('logout', () => {
    it('calls authStore.logout', () => {
      mockLogout.mockImplementation(() => {});
      const { result } = renderAuthContext();

      act(() => {
        result.current.logout();
      });

      expect(mockLogout).toHaveBeenCalled();
    });
  });

  // ── Error boundary ─────────────────────────────────────────────────────────

  describe('useAuthContext outside provider', () => {
    it('throws when used without AuthProvider', () => {
      // Suppress console.error for this expected error
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      expect(() => {
        renderHook(() => useAuthContext());
      }).toThrow('useAuthContext must be used within AuthProvider');

      consoleSpy.mockRestore();
    });
  });
});
