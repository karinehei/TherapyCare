import { Link } from "react-router-dom";
import { DEMO_SOURCE_URL } from "@/demo/config";

/**
 * Explains Django Admin / Swagger without leaving broken /admin links.
 * Screenshots ship with the repo under docs/.
 */
export function DemoBackendPage() {
  const base = import.meta.env.BASE_URL;

  return (
    <div className="page" style={{ maxWidth: 640 }}>
      <h1 className="page-title">Backend features (full app)</h1>
      <p className="page-subtitle">
        This portfolio demo runs entirely in the browser. Django Admin and the
        interactive OpenAPI docs require the full stack (Django + PostgreSQL).
      </p>

      <div className="card" style={{ marginBottom: "1rem" }}>
        <div className="card-header">Django Admin</div>
        <div className="card-body">
          <p style={{ marginTop: 0 }}>
            Staff manage clinics, referrals, appointments, and users at{" "}
            <code>/admin/</code> when the backend is running locally or in
            Docker.
          </p>
          <img
            src={`${base}docs/admin.png`}
            alt="Screenshot of TherapyCare Django admin"
            style={{
              width: "100%",
              borderRadius: "var(--radius)",
              border: "1px solid var(--color-border)",
            }}
          />
        </div>
      </div>

      <div className="card" style={{ marginBottom: "1rem" }}>
        <div className="card-header">API documentation (Swagger)</div>
        <div className="card-body">
          <p style={{ marginTop: 0 }}>
            Interactive schema at <code>/api/docs/</code> in the full
            application.
          </p>
          <img
            src={`${base}docs/api-docs.png`}
            alt="Screenshot of TherapyCare API Swagger docs"
            style={{
              width: "100%",
              borderRadius: "var(--radius)",
              border: "1px solid var(--color-border)",
            }}
          />
        </div>
      </div>

      <p>
        <a href={DEMO_SOURCE_URL} target="_blank" rel="noopener noreferrer">
          View repository &amp; setup instructions
        </a>
      </p>
      <p>
        <Link to="/">← Back to demo</Link>
      </p>
    </div>
  );
}
