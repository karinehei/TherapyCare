import { Link, Outlet } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";

export function Layout() {
  const { user, isLoading } = useAuth();

  return (
    <div className="layout">
      <header className="layout-header">
        <Link to="/">TherapyCare</Link>
        {!isLoading && (
          <nav>
            {user ? (
              <Link to="/app" className="btn btn-ghost">
                Dashboard
              </Link>
            ) : (
              <Link to="/login" className="btn btn-primary">
                Login
              </Link>
            )}
          </nav>
        )}
      </header>
      <main className="layout-main">
        <Outlet />
      </main>
    </div>
  );
}
