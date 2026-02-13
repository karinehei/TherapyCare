import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";

type Role = "support" | "clinic_admin" | "therapist" | "help_seeker";

interface ProtectedRouteProps {
  children: React.ReactNode;
  roles?: Role[];
}

export function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="page-loading">
        <span>Loading…</span>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (roles && roles.length > 0 && !roles.includes(user.role as Role)) {
    return <Navigate to="/app" replace />;
  }

  return <>{children}</>;
}

