import { isDemoMode } from "@/demo/config";
import { api, clearTokens, getRefreshToken, setTokens } from "./client";
import { ApiError } from "./errors";

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
  is_staff?: boolean;
  therapist_profile_id?: number | null;
}

export async function login(
  email: string,
  password: string
): Promise<LoginResponse> {
  if (isDemoMode) {
    throw new ApiError(
      400,
      "Demo mode",
      "Use role selection instead of email/password in the portfolio demo."
    );
  }
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
  if (isDemoMode) {
    const { setDemoRole } = await import("@/demo/store");
    setDemoRole(null);
    return;
  }
  const refresh = getRefreshToken();
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
  if (isDemoMode) {
    const { getDemoRole } = await import("@/demo/store");
    const { DEMO_USERS } = await import("@/demo/fixtures");
    const role = getDemoRole();
    if (!role) {
      throw new ApiError(401, "Unauthorized", "No demo role selected.");
    }
    return DEMO_USERS[role];
  }
  return api.get<MeResponse>("/me/");
}
