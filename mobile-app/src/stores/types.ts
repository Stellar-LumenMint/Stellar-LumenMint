/**
 * Stellar wallet and auth types for the LumenMint mobile app.
 *
 * @module types/auth
 */

/** Stellar wallet keypair */
export interface Wallet {
  /** Stellar public key (starts with G, 56 characters) */
  publicKey: string;
  /** Stellar secret key (starts with S, 56 characters) */
  secretKey: string;
}

/** Authenticated user profile */
export interface User {
  id: string;
  email: string;
  username: string;
}

/** Auth state managed by Zustand store */
export interface AuthState {
  user: User | null;
  wallet: Wallet | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  setUser: (user: User | null) => void;
  setWallet: (wallet: Wallet | null) => void;
  setAuthenticated: (value: boolean) => void;
  setLoading: (value: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  loginWithWallet: (wallet: Wallet) => Promise<void>;
  registerWithEmail: (email: string, password: string, username: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<boolean>;
}
