"use client";
import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useAuthStore } from "../stores/auth-store";
import { User, UserWallet } from "@/types/auth";
// Import the full AuthStore type from the store, but override User to match types/auth
import type { AuthStore as StoreAuthStore } from "../stores/types";

export interface WalletChallenge {
  sessionId: string;
  walletAddress: string;
  nonce: string;
  message: string;
  expiresAt: string;
}

export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  loginWithWallet: (address: string, walletProvider?: string) => Promise<WalletChallenge>;
  verifyWalletLogin: (address: string, nonce: string, signature: string, walletProvider?: string) => Promise<void>;
  register: (email: string, password: string, username?: string) => Promise<void>;
  logout: () => void;
  linkWallet: (address: string, walletProvider?: string) => Promise<WalletChallenge>;
  verifyWalletLink: (address: string, nonce: string, signature: string, walletProvider?: string) => Promise<void>;
  unlinkWallet: (address: string) => Promise<void>;
  wallets: UserWallet[];
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  // Cast auth to the correct extended type
  const auth = useAuthStore() as unknown as StoreAuthStore & {
    register: (email: string, password: string, username?: string) => Promise<void>;
    emailLogin: (email: string, password: string) => Promise<void>;
    getWalletChallenge: (address: string, walletProvider?: string) => Promise<WalletChallenge>;
    verifyWalletSignature: (address: string, nonce: string, signature: string, walletProvider?: string) => Promise<void>;
    linkWallet: (address: string, nonce: string, signature: string, walletProvider?: string) => Promise<unknown>;
    unlinkWallet: (address: string) => Promise<void>;
    listWallets: () => Promise<UserWallet[]>;
    logout: () => void;
    user: User | null;
    isAuthenticated: boolean;
    loading: boolean;
    setLoading: (loading: boolean) => void;
  };
  const [wallets, setWallets] = useState<UserWallet[]>([]);

  // Load wallets on user change
  useEffect(() => {
    if (auth.user) {
      auth.listWallets().then((w) => setWallets(w as UserWallet[])).catch(() => setWallets([]));
    } else {
      setWallets([]);
    }
  }, [auth.user]);

  const loginWithEmail = async (email: string, password: string) => {
    await auth.emailLogin(email, password);
  };

  const loginWithWallet = async (address: string, walletProvider?: string): Promise<WalletChallenge> => {
    // 1. Request a challenge from the backend
    const challenge = await auth.getWalletChallenge(address, walletProvider);
    // 2. Return challenge to the caller so the UI can handle wallet signing
    //    (e.g., Freighter, Albedo, WalletConnect)
    // 3. After signing, caller invokes verifyWalletLogin with the signature
    return challenge;
  };

  const verifyWalletLogin = async (
    address: string,
    nonce: string,
    signature: string,
    walletProvider?: string,
  ): Promise<void> => {
    await auth.verifyWalletSignature(address, nonce, signature, walletProvider);
  };

  const register = async (email: string, password: string, username?: string) => {
    await auth.register(email, password, username);
  };

  const logout = () => {
    auth.logout();
  };

  const linkWallet = async (address: string, walletProvider?: string): Promise<WalletChallenge> => {
    // 1. Request a challenge for the wallet to link
    const challenge = await auth.getWalletChallenge(address, walletProvider);
    // 2. Return challenge to the caller so the UI can handle wallet signing
    // 3. After signing, caller invokes verifyWalletLink with the signature
    return challenge;
  };

  const verifyWalletLink = async (
    address: string,
    nonce: string,
    signature: string,
    walletProvider?: string,
  ): Promise<void> => {
    await auth.linkWallet(address, nonce, signature, walletProvider);
    setWallets((await auth.listWallets() as UserWallet[]) || []);
  };

  const unlinkWallet = async (address: string) => {
    await auth.unlinkWallet(address);
    setWallets((await auth.listWallets() as UserWallet[]) || []);
  };

  const value: AuthContextType = {
    user: auth.user as User | null,
    isLoading: auth.loading,
    isAuthenticated: auth.isAuthenticated,
    loginWithEmail,
    loginWithWallet,
    verifyWalletLogin,
    register,
    logout,
    linkWallet,
    verifyWalletLink,
    unlinkWallet,
    wallets,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuthContext = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuthContext must be used within AuthProvider");
  return ctx;
};
