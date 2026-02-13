import { Link } from "react-router-dom";

export function AppDashboard() {
  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Welcome back. Quick links:</p>
      </div>
      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
        <Link
          to="/app/referrals"
          className="card"
          style={{ padding: "1.25rem", minWidth: 180 }}
        >
          <strong>Referrals</strong>
          <p
            style={{
              margin: "0.25rem 0 0",
              fontSize: "0.875rem",
              color: "var(--color-text-muted)",
            }}
          >
            View and manage referrals
          </p>
        </Link>
        <Link
          to="/app/patients"
          className="card"
          style={{ padding: "1.25rem", minWidth: 180 }}
        >
          <strong>Patients</strong>
          <p
            style={{
              margin: "0.25rem 0 0",
              fontSize: "0.875rem",
              color: "var(--color-text-muted)",
            }}
          >
            Patient records
          </p>
        </Link>
        <Link
          to="/app/appointments"
          className="card"
          style={{ padding: "1.25rem", minWidth: 180 }}
        >
          <strong>Appointments</strong>
          <p
            style={{
              margin: "0.25rem 0 0",
              fontSize: "0.875rem",
              color: "var(--color-text-muted)",
            }}
          >
            Calendar and bookings
          </p>
        </Link>
        <Link
          to="/app/audit"
          className="card"
          style={{ padding: "1.25rem", minWidth: 180 }}
        >
          <strong>Audit</strong>
          <p
            style={{
              margin: "0.25rem 0 0",
              fontSize: "0.875rem",
              color: "var(--color-text-muted)",
            }}
          >
            Activity log (support)
          </p>
        </Link>
      </div>
    </div>
  );
}
