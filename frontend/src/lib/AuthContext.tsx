"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { TOKEN_KEY, apiFetch } from "@/lib/apiFetch";

interface User {
  id: number;
  name: string;
  email: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

const API = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore session on mount
  useEffect(() => {
    const saved = localStorage.getItem(TOKEN_KEY);
    if (saved) {
      setToken(saved);
      apiFetch(API + "/api/auth/me", { headers: { Authorization: "Bearer " + saved } })
        .then((r) => (r.ok ? r.json() : null))
        .then((u) => { if (u) setUser(u); else { localStorage.removeItem(TOKEN_KEY); setToken(null); } })
        .catch(() => { localStorage.removeItem(TOKEN_KEY); setToken(null); })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const r = await apiFetch(API + "/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const j = await r.json();
    if (!r.ok) throw new Error(j.detail || "Login failed");
    if (!j.access_token) throw new Error("Login failed: no access token returned");
    localStorage.setItem(TOKEN_KEY, j.access_token);
    setToken(j.access_token);
    setUser(j.user);
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const r = await apiFetch(API + "/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    const j = await r.json();
    if (!r.ok) throw new Error(j.detail || "Registration failed");
    if (!j.access_token) throw new Error("Registration failed: no access token returned");
    localStorage.setItem(TOKEN_KEY, j.access_token);
    setToken(j.access_token);
    setUser(j.user);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}