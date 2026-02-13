import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";

const APP_NAV = [
  { to: "/app/referrals", label: "Referrals" },
  { to: "/app/patients", label: "Patients" },
  { to: "/app/appointments", label: "Appointments" },
  { to: "/app/audit", label: "Audit", roles: ["support", "clinic_admin"] },
];

export function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const navItems = APP_NAV.filter(
    (item) => !item.roles || (user && item.roles.includes(user.role))
  );

  return (
    <div className="app-shell">
      <header className="app-header">
        <Link to="/" className="app-logo">
          TherapyCare
        </Link>
        <nav className="app-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `app-nav-link ${isActive ? "active" : ""}`}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="app-user">
          <span className="app-user-email">{user?.email}</span>
          <span className="app-user-role">({user?.role})</span>
          <button type="button" className="btn btn-ghost" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
