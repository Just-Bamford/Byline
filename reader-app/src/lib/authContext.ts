/**
 * Authentication Context
 * Manages wallet state and session for email-based and Freighter wallets
 */

import { createContext, useContext } from "react";

export type WalletType = "freighter" | "custodial" | null;

export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  walletType: WalletType;
  walletAddress: string | null;
  email: string | null;
  sessionToken: string | null;
  hasExported: boolean;
  error: string | null;
}

export interface AuthContextType extends AuthState {
  // Email auth
  signup: (email: string) => Promise<void>;
  login: (email: string) => Promise<void>;
  verifyMagicLink: (token: string) => Promise<void>;

  // Freighter auth
  connectFreighter: () => Promise<void>;

  // Session management
  logout: () => Promise<void>;

  // Wallet export
  getExportKey: () => Promise<{
    publicKey: string;
    secretKey: string;
  }>;

  // Utility
  clearError: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined,
);

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}

/**
 * Persists auth state to localStorage
 */
export const AUTH_STORAGE_KEY = "byline_auth";

export interface StoredAuthState {
  sessionToken?: string;
  walletAddress?: string;
  walletType?: WalletType;
  email?: string;
  hasExported?: boolean;
}

export function saveAuthState(state: StoredAuthState): void {
  try {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error("Failed to save auth state:", error);
  }
}

export function loadAuthState(): StoredAuthState | null {
  try {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.error("Failed to load auth state:", error);
    return null;
  }
}

export function clearAuthState(): void {
  try {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  } catch (error) {
    console.error("Failed to clear auth state:", error);
  }
}
