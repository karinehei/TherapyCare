import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { fetchMe, login as apiLogin, logout as apiLogout } from "@/api/auth";
import type { Me } from "@/api/schemas";
import { getAccessToken } from "@/api/client";
import { isDemoMode, type DemoRole } from "@/demo/config";

interface AuthState {
  user: Me | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  /** Demo-only: simulated role selection (not real auth / JWT). */
  selectDemoRole: (role: DemoRole) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Me | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const refresh = useCallback(async () => {
    if (isDemoMode) {
      const { getDemoRole } = await import("@/demo/store");
      if (!getDemoRole()) {
        setUser(null);
        setIsLoading(false);
        return;
      }
      try {
        const me = await fetchMe();
        setUser(me);
      } catch {
        setUser(null);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    if (!getAccessToken()) {
      setUser(null);
      setIsLoading(false);
      return;
    }
    try {
      const me = await fetchMe();
      setUser(me);
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(
    async (email: string, password: string) => {
      setIsLoading(true);
      await apiLogin(email, password);
      await refresh();
      navigate("/app");
    },
    [navigate, refresh]
  );

  const selectDemoRole = useCallback(
    async (role: DemoRole) => {
      if (!isDemoMode) return;
      const { setDemoRole } = await import("@/demo/store");
      queryClient.clear();
      setDemoRole(role);
      setIsLoading(true);
      try {
        const me = await fetchMe();
        setUser(me);
        navigate("/app");
      } catch {
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    },
    [navigate, queryClient]
  );

  const logout = useCallback(async () => {
    await apiLogout();
    if (isDemoMode) {
      queryClient.clear();
    }
    setUser(null);
    navigate("/login");
  }, [navigate, queryClient]);

  const value = useMemo(
    () => ({
      user,
      isLoading,
      isAuthenticated: !!user,
      login,
      logout,
      refresh,
      selectDemoRole,
    }),
    [user, isLoading, login, logout, refresh, selectDemoRole]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
