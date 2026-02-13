import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import { paginatedSchema, referralListSchema } from "@/api/schemas";
import { useAuth } from "@/auth/AuthContext";
import { REFERRAL_STATUSES } from "@/referrals/constants";
import type { ReferralList } from "@/api/schemas";

const schema = paginatedSchema(referralListSchema);

export function ReferralsPage() {
  const { user } = useAuth();
  const [statusFilter, setStatusFilter] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "kanban">("list");

  const isAdmin = user?.role === "clinic_admin" || user?.is_staff;
  const canCreate = user?.role === "help_seeker" || isAdmin;

  const { data, isLoading, error } = useQuery({
    queryKey: ["referrals", statusFilter],
    queryFn: async () => {
      const params = statusFilter ? `?status=${encodeURIComponent(statusFilter)}` : "";
      const res = await api.get<unknown>(`/referrals/${params}`);
      return schema.parse(res);
    },
  });

  const results = data?.results ?? [];

  const byStatus = results.reduce<Record<string, ReferralList[]>>((acc: Record<string, ReferralList[]>, r: ReferralList) => {
    (acc[r.status] = acc[r.status] ?? []).push(r);
    return acc;
  }, {});

  if (isLoading) {
    return (
      <div className="page">
        <div className="page-loading">Loading referrals…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page">
        <div className="empty-state error">Failed to load referrals.</div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header referrals-header">
        <div>
          <h1 className="page-title">Referrals</h1>
          <p className="page-subtitle">{data?.count ?? 0} referral(s)</p>
        </div>
        {canCreate && (
          <Link to="/app/referrals/new" className="btn btn-primary">
            New referral
          </Link>
        )}
        <div className="referrals-controls">
          <select
            className="input"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter referrals by status"
          >
            <option value="">All statuses</option>
            {REFERRAL_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          {isAdmin && (
            <div className="referrals-view-toggle" role="group" aria-label="Referral view mode">
              <button
                type="button"
                className={`btn ${viewMode === "list" ? "btn-primary" : "btn-ghost"}`}
                onClick={() => setViewMode("list")}
                aria-pressed={viewMode === "list"}
              >
                List
              </button>
              <button
                type="button"
                className={`btn ${viewMode === "kanban" ? "btn-primary" : "btn-ghost"}`}
                onClick={() => setViewMode("kanban")}
                aria-pressed={viewMode === "kanban"}
              >
                Kanban
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="card">
        {!results.length ? (
          <div className="empty-state">
            No referrals yet.
            {canCreate && (
              <p>
                <Link to="/app/referrals/new">Create your first referral</Link>
              </p>
            )}
          </div>
        ) : viewMode === "kanban" && isAdmin ? (
          <div className="kanban-board" aria-label="Referrals kanban board">
            {REFERRAL_STATUSES.map((s) => (
              <div key={s.value} className="kanban-column">
                <div className="kanban-column-header" title={s.label}>
                  <span className="kanban-column-title">{s.label}</span>
                  <span className="kanban-count-pill">{(byStatus[s.value] ?? []).length}</span>
                </div>
                <div className="kanban-column-body">
                  {(byStatus[s.value] ?? []).length === 0 ? (
                    <div className="kanban-empty">No referrals</div>
                  ) : (
                    (byStatus[s.value] ?? []).map((r) => (
                      <Link key={r.id} to={`/app/referrals/${r.id}`} className="kanban-card">
                        <div className="kanban-card-title">{r.patient_name}</div>
                        <div className="kanban-card-subtitle">{r.patient_email}</div>
                        <div className="kanban-card-meta">
                          <span>Created {new Date(r.created_at).toLocaleDateString()}</span>
                          <span className="kanban-dot" aria-hidden="true">
                            ·
                          </span>
                          <span>{r.assigned_therapist ? `Assigned #${r.assigned_therapist}` : "Unassigned"}</span>
                        </div>
                      </Link>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th>Assigned</th>
                  <th>Created</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {results.map((r) => (
                  <tr key={r.id}>
                    <td>{r.patient_name}</td>
                    <td>{r.patient_email}</td>
                    <td>
                      <span
                        style={{
                          padding: "0.2rem 0.5rem",
                          borderRadius: 4,
                          background: "var(--color-bg)",
                          fontSize: "0.8125rem",
                        }}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td>{r.assigned_therapist ? `#${r.assigned_therapist}` : "—"}</td>
                    <td>{new Date(r.created_at).toLocaleDateString()}</td>
                    <td>
                      <Link to={`/app/referrals/${r.id}`}>View</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
