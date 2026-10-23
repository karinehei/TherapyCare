import { useState } from "react";
import {
  Link,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { loginSchema } from "@/api/schemas";
import type { LoginForm } from "@/api/schemas";
import { useAuth } from "@/auth/AuthContext";
import { ApiError } from "@/api/client";
import { DEMO_ROLES, isDemoMode, type DemoRole } from "@/demo/config";

export function LoginPage() {
  const { login, selectDemoRole } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);
  const [selecting, setSelecting] = useState(false);

  const next =
    searchParams.get("next") ??
    (location.state as { from?: { pathname: string } })?.from?.pathname ??
    "/app";

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "admin@therapycare.demo", password: "demo123" },
  });

  const onSubmit = async (data: LoginForm) => {
    setServerError(null);
    try {
      await login(data.email, data.password);
      navigate(next, { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setServerError(
          typeof err.detail === "string" ? err.detail : "Login failed"
        );
      } else {
        setServerError("Login failed. Please try again.");
      }
    }
  };

  const onSelectRole = async (role: DemoRole) => {
    setServerError(null);
    setSelecting(true);
    try {
      queryClient.clear();
      await selectDemoRole(role);
      navigate(next, { replace: true });
    } catch (err) {
      setServerError(
        err instanceof Error ? err.message : "Could not select demo role."
      );
    } finally {
      setSelecting(false);
    }
  };

  if (isDemoMode) {
    return (
      <div className="page" style={{ maxWidth: 520 }}>
        <div className="card">
          <div className="card-header">Choose a demo role</div>
          <div className="card-body">
            <p style={{ marginTop: 0, color: "var(--color-text-muted)" }}>
              Simulated access only — no accounts, passwords, or tokens. Data
              stays in this browser tab session.
            </p>
            {serverError && (
              <div
                className="empty-state error"
                style={{
                  padding: "0.75rem",
                  marginBottom: "1rem",
                  textAlign: "left",
                }}
              >
                {serverError}
              </div>
            )}
            <div className="demo-role-list" role="list">
              {DEMO_ROLES.map((r) => (
                <button
                  key={r.role}
                  type="button"
                  role="listitem"
                  className="demo-role-card"
                  disabled={selecting}
                  onClick={() => onSelectRole(r.role)}
                >
                  <strong>{r.label}</strong>
                  <span>{r.description}</span>
                </button>
              ))}
            </div>
            <p
              style={{
                marginTop: "1rem",
                fontSize: "0.875rem",
                color: "var(--color-text-muted)",
              }}
            >
              <Link to="/">← Back to search</Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page" style={{ maxWidth: 400 }}>
      <div className="card">
        <div className="card-header">Login</div>
        <div className="card-body">
          {serverError && (
            <div
              className="empty-state error"
              style={{
                padding: "0.75rem",
                marginBottom: "1rem",
                textAlign: "left",
              }}
            >
              {serverError}
            </div>
          )}
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="input-group">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                className={`input ${errors.email ? "input-error" : ""}`}
                {...register("email")}
                autoComplete="email"
              />
              {errors.email && (
                <div className="input-error-message">
                  {errors.email.message}
                </div>
              )}
            </div>
            <div className="input-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                className={`input ${errors.password ? "input-error" : ""}`}
                {...register("password")}
                autoComplete="current-password"
              />
              {errors.password && (
                <div className="input-error-message">
                  {errors.password.message}
                </div>
              )}
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Logging in…" : "Login"}
            </button>
          </form>
          <p
            style={{
              marginTop: "1rem",
              fontSize: "0.875rem",
              color: "var(--color-text-muted)",
            }}
          >
            <Link to="/">← Back to search</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
