import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import * as SecureStore from 'expo-secure-store';
import { Wallet } from '../services/stellar/types';
import { SecureStorage } from '../services/stellar/secureStorage';
import { AuthState, User } from './types';
import { authService } from '../services/auth/auth.service';
import { tokenStorage } from '../services/auth/tokenStorage';

const secureStorage = new SecureStorage();

const AUTH_TOKEN_KEY = 'stellar_lumenmint_auth_token';

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      wallet: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // Simple setters
      setUser: (user) => set({ user }),
      setWallet: (wallet) => set({ wallet }),
      setAuthenticated: (value) => set({ isAuthenticated: value }),
      setLoading: (value) => set({ isLoading: value }),
      setError: (error) => set({ error }),
      clearError: () => set({ error: null }),

      // Login with email and password
      loginWithEmail: async (email, password) => {
        if (get().isLoading) return;
        set({ isLoading: true, error: null });
        try {
          const { user } = await authService.emailLogin(email, password);
          await SecureStore.setItemAsync(AUTH_TOKEN_KEY, 'true');
          set({ user, isAuthenticated: true });
        } catch (err) {
          const message = (err as { message?: string })?.message ?? 'Email login failed';
          set({ error: message });
          throw err;
        } finally {
          set({ isLoading: false });
        }
      },

      // Login with an existing Stellar wallet
      loginWithWallet: async (wallet: Wallet) => {
        if (get().isLoading) return;
        set({ isLoading: true, error: null });
        try {
          await secureStorage.saveWallet(wallet);
          set({ wallet, isAuthenticated: true });
        } catch (err) {
          set({ error: (err as Error).message });
        } finally {
          set({ isLoading: false });
        }
      },

      // Register a new account with email and password
      registerWithEmail: async (email, password, username) => {
        if (get().isLoading) return;
        set({ isLoading: true, error: null });
        try {
          const { user } = await authService.emailRegister(email, password, username);
          await SecureStore.setItemAsync(AUTH_TOKEN_KEY, 'true');
          set({ user, isAuthenticated: true });
        } catch (err) {
          const message = (err as { message?: string })?.message ?? 'Email registration failed';
          set({ error: message });
          throw err;
        } finally {
          set({ isLoading: false });
        }
      },

      // Logout: clear all auth state and stored credentials
      logout: async () => {
        set({ isLoading: true, error: null });
        try {
          await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
          await secureStorage.deleteWallet();
        } catch {
          // Ignore storage errors on logout to ensure state is always cleared
        } finally {
          set({ user: null, wallet: null, isAuthenticated: false, isLoading: false });
        }
      },

      // Check if a valid auth session exists (wallet or token)
      checkAuth: async () => {
        set({ isLoading: true, error: null });
        try {
          const sessionFlag = await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
          if (sessionFlag) {
            const refreshToken = await tokenStorage.getRefreshToken();
            if (refreshToken) {
              try {
                const { user } = await authService.refreshToken(refreshToken);
                set({ user, isAuthenticated: true });
                return true;
              } catch {
                // Token refresh failed — clear stale session
                await tokenStorage.clearTokens();
                await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
              }
            } else {
              // Session flag exists but no refresh token — clear stale flag
              await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
            }
          }

          const hasWallet = await secureStorage.hasWallet();
          if (hasWallet) {
            const wallet = await secureStorage.getWallet();
            set({ wallet, isAuthenticated: true });
            return true;
          }

          set({ isAuthenticated: false });
          return false;
        } catch (err) {
          set({ error: (err as Error).message, isAuthenticated: false });
          return false;
        } finally {
          set({ isLoading: false });
        }
      },
    }),
    {
      name: 'stellar-lumenmint-auth-storage',
      storage: createJSONStorage(() => ({
        getItem: async (key: string) => await SecureStore.getItemAsync(key),
        setItem: async (key: string, value: string) => await SecureStore.setItemAsync(key, value),
        removeItem: async (key: string) => await SecureStore.deleteItemAsync(key),
      })),
      // Only persist non-sensitive state; credentials are managed by SecureStorage
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
