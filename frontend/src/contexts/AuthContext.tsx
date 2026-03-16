"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import api, { setAccessToken } from "@/lib/api";
import type { User, TokenResponse } from "@/types/index";

// ─── Types ────────────────────────────────────────────────────────────────────

interface LoginCredentials {
  email: string;
  password: string;
}

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  loginWithToken: (accessToken: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User) => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const initialized = useRef(false);

  // On mount: try to restore session via refresh cookie
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    (async () => {
      try {
        const res = await api.post<{ access_token: string }>(
          "/auth/refresh",
          {},
          { withCredentials: true }
        );
        setAccessToken(res.data.access_token);

        const meRes = await api.get<User>("/auth/me");
        setUser(meRes.data);
      } catch {
        // No valid session — user stays null
        setAccessToken(null);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const login = useCallback(async (credentials: LoginCredentials) => {
    const res = await api.post<TokenResponse>("/auth/login", credentials);
    setAccessToken(res.data.access_token);
    setUser(res.data.user);
  }, []);

  const loginWithToken = useCallback(async (accessToken: string) => {
    setAccessToken(accessToken);
    const meRes = await api.get<User>("/auth/me");
    setUser(meRes.data);
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } finally {
      setAccessToken(null);
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, loginWithToken, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuthContext must be used inside AuthProvider");
  return ctx;
}
