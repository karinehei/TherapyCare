import { useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import {
  DEMO_ROLES,
  DEMO_SOURCE_URL,
  isDemoMode,
  type DemoRole,
} from "./config";
import { resetDemoState } from "./store";

export function DemoBanner() {
  const { user, selectDemoRole, logout } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  if (!isDemoMode) return null;

  const roleLabel =
    DEMO_ROLES.find((r) => r.role === user?.role)?.label ??
    user?.role ??
    "None";

  const handleReset = async () => {
    resetDemoState();
    queryClient.clear();
    await logout();
    navigate("/login", { replace: true });
  };

  const handleSwitchRole = async () => {
    queryClient.clear();
    await logout();
    navigate("/login", { replace: true });
  };

  const handleQuickRole = async (role: DemoRole) => {
    queryClient.clear();
    await selectDemoRole(role);
  };

  return (
    <div className="demo-banner" role="status">
      <div className="demo-banner-main">
        <strong>Portfolio demo</strong>
        <span aria-hidden="true"> — </span>
        <span>fictional data, simulated actions.</span>
      </div>
      <div className="demo-banner-meta">
        <span className="demo-banner-role">
          Role: <strong>{user ? roleLabel : "Not selected"}</strong>
        </span>
        {user ? (
          <button
            type="button"
            className="btn btn-ghost demo-banner-btn"
            onClick={handleSwitchRole}
          >
            Switch role
          </button>
        ) : (
          <div
            className="demo-banner-quick"
            role="group"
            aria-label="Quick role select"
          >
            {DEMO_ROLES.map((r) => (
              <button
                key={r.role}
                type="button"
                className="btn btn-ghost demo-banner-btn"
                onClick={() => handleQuickRole(r.role)}
              >
                {r.label}
              </button>
            ))}
          </div>
        )}
        <button
          type="button"
          className="btn btn-ghost demo-banner-btn"
          onClick={handleReset}
        >
          Reset demo
        </button>
        <a
          href={DEMO_SOURCE_URL}
          className="demo-banner-link"
          target="_blank"
          rel="noopener noreferrer"
        >
          Source code
        </a>
        <Link to="/demo/backend" className="demo-banner-link">
          Backend features
        </Link>
      </div>
    </div>
  );
}
