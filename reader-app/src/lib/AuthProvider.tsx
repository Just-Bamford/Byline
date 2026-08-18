/**
 * Auth Provider
 * Manages authentication state and provides auth context
 */

import React, { useState, useEffect, useCallback, ReactNode } from "react";
import {
  AuthContext,
  AuthContextType,
  AuthState,
  WalletType,
  saveAuthState,
  loadAuthState,
  clearAuthState,
} from "./authContext";
import { connectFreighter } from "./wallet";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    walletType: null,
    walletAddress: null,
    email: null,
    sessionToken: null,
    hasExported: false,
    error: null,
  });

  // Initialize from localStorage and check session
  useEffect(() => {
    const initAuth = async () => {
      const stored = loadAuthState();

      if (stored?.sessionToken) {
        try {
          // Verify session is still valid
          const response = await fetch(`${BACKEND_URL}/auth/status`, {
            headers: {
              Authorization: `Bearer ${stored.sessionToken}`,
            },
          });

          if (response.ok) {
            setState({
              isAuthenticated: true,
              isLoading: false,
              walletType: stored.walletType || "custodial",
              walletAddress: stored.walletAddress || null,
              email: stored.email || null,
              sessionToken: stored.sessionToken,
              hasExported: stored.hasExported || false,
              error: null,
            });
            return;
          }
        } catch (error) {
          console.error("Session verification failed:", error);
        }
      }

      setState((prev) => ({ ...prev, isLoading: false }));
    };

    initAuth();
  }, []);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  const signup = useCallback(async (email: string) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await fetch(`${BACKEND_URL}/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Signup failed");
      }

      setState((prev) => ({
        ...prev,
        isLoading: false,
        email,
        error: null,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Signup failed";
      setState((prev) => ({ ...prev, isLoading: false, error: message }));
      throw error;
    }
  }, []);

  const login = useCallback(async (email: string) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await fetch(`${BACKEND_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Login failed");
      }

      setState((prev) => ({
        ...prev,
        isLoading: false,
        email,
        error: null,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Login failed";
      setState((prev) => ({ ...prev, isLoading: false, error: message }));
      throw error;
    }
  }, []);

  const verifyMagicLink = useCallback(async (token: string) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await fetch(`${BACKEND_URL}/auth/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Verification failed");
      }

      const data = await response.json();

      const newState = {
        isAuthenticated: true,
        isLoading: false,
        walletType: data.walletType as WalletType,
        walletAddress: data.walletAddress,
        email: data.email,
        sessionToken: data.sessionToken,
        hasExported: false,
        error: null,
      };

      setState(newState);

      // Save to localStorage
      saveAuthState({
        sessionToken: data.sessionToken,
        walletAddress: data.walletAddress,
        walletType: data.walletType,
        email: data.email,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Verification failed";
      setState((prev) => ({ ...prev, isLoading: false, error: message }));
      throw error;
    }
  }, []);

  const connectFreighterWallet = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const publicKey = await connectFreighter();

      setState((prev) => ({
        ...prev,
        isAuthenticated: true,
        isLoading: false,
        walletType: "freighter",
        walletAddress: publicKey,
        error: null,
      }));

      // Save to localStorage
      saveAuthState({
        walletAddress: publicKey,
        walletType: "freighter",
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Freighter connection failed";
      setState((prev) => ({ ...prev, isLoading: false, error: message }));
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      if (state.sessionToken) {
        await fetch(`${BACKEND_URL}/auth/logout`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionToken: state.sessionToken }),
        });
      }
    } catch (error) {
      console.error("Logout request failed:", error);
    } finally {
      clearAuthState();
      setState({
        isAuthenticated: false,
        isLoading: false,
        walletType: null,
        walletAddress: null,
        email: null,
        sessionToken: null,
        hasExported: false,
        error: null,
      });
    }
  }, [state.sessionToken]);

  const getExportKey = useCallback(async () => {
    if (!state.sessionToken) {
      throw new Error("Not authenticated");
    }

    const response = await fetch(`${BACKEND_URL}/auth/wallet/export-key`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${state.sessionToken}`,
      },
      body: JSON.stringify({ confirm: true }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || "Export failed");
    }

    const data = await response.json();

    // Mark as exported
    setState((prev) => ({
      ...prev,
      hasExported: true,
    }));

    saveAuthState({
      sessionToken: state.sessionToken,
      walletAddress: state.walletAddress,
      walletType: state.walletType,
      email: state.email,
      hasExported: true,
    });

    return {
      publicKey: data.publicKey,
      secretKey: data.secretKey,
    };
  }, [state]);

  const contextValue: AuthContextType = {
    ...state,
    signup,
    login,
    verifyMagicLink,
    connectFreighter: connectFreighterWallet,
    logout,
    getExportKey,
    clearError,
  };

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
}
