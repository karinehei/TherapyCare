/**
 * API client with auth token handling and refresh strategy.
 * Uses localStorage for access/refresh tokens.
 * In demo mode (VITE_DEMO_MODE=true), requests are handled in-process — no fetch.
 */

import { isDemoMode } from "@/demo/config";
import { ApiError } from "./errors";
import type { RequestOptions } from "./types";

export { ApiError } from "./errors";
export type { RequestOptions } from "./types";

const API_BASE = "/api/v1";
const AUTH_BASE = "/api/v1/auth";
const TOKEN_KEY = "therapycare_access";
const REFRESH_KEY = "therapycare_refresh";

export function getAccessToken(): string | null {
  if (isDemoMode) return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  if (isDemoMode) return null;
  return localStorage.getItem(REFRESH_KEY);
}

export function setTokens(access: string, refresh: string): void {
  if (isDemoMode) return;
  localStorage.setItem(TOKEN_KEY, access);
  localStorage.setItem(REFRESH_KEY, refresh);
}

export function clearTokens(): void {
  if (isDemoMode) return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (isDemoMode) return null;
  if (refreshPromise) return refreshPromise;
  const refresh = getRefreshToken();
  if (!refresh) return null;
  refreshPromise = (async () => {
    try {
      const res = await fetch(`${AUTH_BASE}/refresh/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh }),
      });
      if (!res.ok) {
        clearTokens();
        return null;
      }
      const data = await res.json();
      setTokens(data.access, data.refresh ?? refresh);
      return data.access;
    } catch {
      clearTokens();
      return null;
    } finally {
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  if (isDemoMode) {
    const { demoRequest } = await import("@/demo/handlers");
    return demoRequest<T>(path, options);
  }

  const { skipAuth, skipRefresh, ...fetchOpts } = options;
  const url = path.startsWith("http") ? path : `${API_BASE}${path}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(fetchOpts.headers as Record<string, string>),
  };

  let access = skipAuth ? null : getAccessToken();
  if (!access && !skipAuth && !skipRefresh) {
    access = await refreshAccessToken();
  }
  if (access) {
    headers.Authorization = `Bearer ${access}`;
  }

  let res = await fetch(url, { ...fetchOpts, headers });

  if (res.status === 401 && !skipAuth && !skipRefresh) {
    access = await refreshAccessToken();
    if (access) {
      headers.Authorization = `Bearer ${access}`;
      res = await fetch(url, { ...fetchOpts, headers });
    }
  }

  if (!res.ok) {
    const err = new ApiError(res.status, res.statusText);
    try {
      const body = await res.json().catch(() => ({}));
      err.detail = body.detail ?? body;
    } catch {
      err.detail = await res.text();
    }
    throw err;
  }

  const contentType = res.headers.get("content-type");
  if (contentType?.includes("application/json")) {
    return res.json() as Promise<T>;
  }
  return res.text() as Promise<T>;
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) =>
    apiRequest<T>(path, { ...options, method: "GET" }),

  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    apiRequest<T>(path, {
      ...options,
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    }),

  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    apiRequest<T>(path, {
      ...options,
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
    }),

  delete: <T>(path: string, options?: RequestOptions) =>
    apiRequest<T>(path, { ...options, method: "DELETE" }),
};
