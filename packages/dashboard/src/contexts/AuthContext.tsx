import React, { createContext, useContext, useMemo, useState, useEffect } from "react";
import { GOOGLE_TOKEN_STORAGE_KEY, GOOGLE_USER_STORAGE_KEY } from "../constants/auth";

/** Authenticated user metadata stored client-side. */
export type AuthUser = {
  email: string;
  name?: string;
  picture?: string;
};

type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  setAuth: (token: string, user: AuthUser) => void;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/** Provides auth state and persistence for Google login. */
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const storedToken = localStorage.getItem(GOOGLE_TOKEN_STORAGE_KEY);
    const storedUser = localStorage.getItem(GOOGLE_USER_STORAGE_KEY);

    if (storedToken) {
      setToken(storedToken);
    }

    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser) as AuthUser);
      } catch {
        localStorage.removeItem(GOOGLE_USER_STORAGE_KEY);
      }
    }
  }, []);

  const setAuth = (newToken: string, newUser: AuthUser) => {
    setToken(newToken);
    setUser(newUser);
    if (typeof window !== "undefined") {
      localStorage.setItem(GOOGLE_TOKEN_STORAGE_KEY, newToken);
      localStorage.setItem(GOOGLE_USER_STORAGE_KEY, JSON.stringify(newUser));
    }
  };

  const signOut = () => {
    setToken(null);
    setUser(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem(GOOGLE_TOKEN_STORAGE_KEY);
      localStorage.removeItem(GOOGLE_USER_STORAGE_KEY);
    }
  };

  const value = useMemo(
    () => ({
      user,
      token,
      setAuth,
      signOut,
    }),
    [user, token]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/**
 * Access the auth context.
 * Must be used within {@link AuthProvider}.
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
