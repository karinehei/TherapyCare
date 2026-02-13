import { api, ApiError, clearTokens, setTokens } from "./client";

const AUTH_BASE = "/api/v1/auth";

export interface LoginResponse {
  access: string;
  refresh: string;
}

export interface MeResponse {
  id: number;
  email: string;
  role: string;
  first_name: string;
  last_name: string;
  phone: string;
  date_joined: string;
}

export async function login(
  email: string,
  password: string
): Promise<LoginResponse> {
  const res = await fetch(`${AUTH_BASE}/login/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const msg = typeof body.detail === "string" ? body.detail : "Login failed";
    throw new ApiError(res.status, msg, body);
  }
  const data = await res.json();
  setTokens(data.access, data.refresh);
  return data;
}

export async function logout(): Promise<void> {
  const refresh = (await import("./client")).getRefreshToken();
  if (refresh) {
    try {
      await fetch(`${AUTH_BASE}/logout/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh }),
      });
    } catch {
      /* ignore */
    }
  }
  clearTokens();
}

export async function fetchMe(): Promise<MeResponse> {
  return api.get<MeResponse>("/me/");
}
