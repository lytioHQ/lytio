"use client";

export const TOKEN_KEY = "excelpilot_token";

/**
 * fetch wrapper that attaches the session token and handles auth failures.
 * - Reads the token from localStorage (excelpilot_token).
 * - Adds `Authorization: Bearer <token>` when present, preserving existing headers.
 * - Leaves request bodies untouched (FormData keeps its multipart boundary).
 * - On 401: clears the stale token and redirects to /login (unless already there).
 */
export async function apiFetch(url: string, options?: RequestInit): Promise<Response> {
  const token = typeof window !== "undefined" ? window.localStorage.getItem(TOKEN_KEY) : null;

  const headers = new Headers(options?.headers);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(url, { ...options, headers });

  if (res.status === 401 && typeof window !== "undefined") {
    window.localStorage.removeItem(TOKEN_KEY);
    if (!window.location.pathname.startsWith("/login")) {
      window.location.assign("/login");
    }
  }

  return res;
}