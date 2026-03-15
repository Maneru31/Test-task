"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import api from "@/lib/api";
import type { GuestTokenResponse } from "@/types/index";

// ─── Types ────────────────────────────────────────────────────────────────────

interface GuestContextValue {
  guestToken: string | null;
  guestName: string | null;
  setGuest: (displayName: string) => Promise<void>;
  clearGuest: () => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const GuestContext = createContext<GuestContextValue | null>(null);

const STORAGE_KEY_TOKEN = "guest_token";
const STORAGE_KEY_NAME = "guest_display_name";

// ─── Provider ─────────────────────────────────────────────────────────────────

export function GuestProvider({ children }: { children: React.ReactNode }) {
  const [guestToken, setGuestToken] = useState<string | null>(null);
  const [guestName, setGuestName] = useState<string | null>(null);

  // Restore from localStorage on mount (browser-only)
  useEffect(() => {
    const token = localStorage.getItem(STORAGE_KEY_TOKEN);
    const name = localStorage.getItem(STORAGE_KEY_NAME);
    if (token) setGuestToken(token);
    if (name) setGuestName(name);
  }, []);

  // Creates a guest session on the backend and persists guest_token to localStorage
  const setGuest = useCallback(async (displayName: string) => {
    const res = await api.post<GuestTokenResponse>("/auth/guest", {
      display_name: displayName,
    });
    const { guest_token, display_name } = res.data;
    localStorage.setItem(STORAGE_KEY_TOKEN, guest_token);
    localStorage.setItem(STORAGE_KEY_NAME, display_name);
    setGuestToken(guest_token);
    setGuestName(display_name);
  }, []);

  const clearGuest = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY_TOKEN);
    localStorage.removeItem(STORAGE_KEY_NAME);
    setGuestToken(null);
    setGuestName(null);
  }, []);

  return (
    <GuestContext.Provider value={{ guestToken, guestName, setGuest, clearGuest }}>
      {children}
    </GuestContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useGuestContext(): GuestContextValue {
  const ctx = useContext(GuestContext);
  if (!ctx) throw new Error("useGuestContext must be used inside GuestProvider");
  return ctx;
}
