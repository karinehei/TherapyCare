import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "@/api/client";
import { ApiError } from "@/api/client";
import { useAuth } from "@/auth/AuthContext";
import { referralDetailSchema } from "@/api/schemas";
import { REFERRAL_STATUSES } from "@/referrals/constants";

const noteSchema = z.object({ body: z.string().min(1, "Note is required") });

export function ReferralDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [statusError, setStatusError] = useState<string | null>(null);

  const isAdmin = user?.role === "clinic_admin" || user?.is_staff;

  const { data, isLoading, error } = useQuery({
    queryKey: ["referral", id],
    queryFn: async () => {
      const res = await api.get<unknown>(`/referrals/${id}/`);
      return referralDetailSchema.parse(res);
    },
    enabled: !!id,
  });

  const { data: therapistsRes } = useQuery({
    queryKey: ["therapists"],
    queryFn: () => api.get<{ results?: { id: number; display_name: string }[] }>("/therapists/"),
    enabled: isAdmin && !!id,
  });
  const therapistList = therapistsRes?.results ?? [];

  const patchMutation = useMutation({
    mutationFn: (payload: { status?: string; assigned_therapist?: number | null }) =>
      api.patch(`/referrals/${id}/`, payload),
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: ["referral", id] });
      const prev = queryClient.getQueryData(["referral", id]);
      if (prev && typeof prev === "object" && "status" in prev) {
        queryClient.setQueryData(["referral", id], { ...prev, ...payload });
      }
      return { prev };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["referral", id] });
      queryClient.invalidateQueries({ queryKey: ["referrals"] });
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      setStatusError(null);
    },
    onError: (err: unknown, _vars, ctx) => {
      setStatusError(err instanceof ApiError ? String(err.detail) : "Update failed");
      if (ctx?.prev) queryClient.setQueryData(["referral", id], ctx.prev);
    },
  });

  const noteMutation = useMutation({
    mutationFn: (body: string) => api.post(`/referrals/${id}/notes/`, { body }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["referral", id] }),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<{ body: string }>({
    resolver: zodResolver(noteSchema),
  });

  if (!id) return null;
  if (isLoading) return <div className="page"><div className="page-loading">Loading…</div></div>;
  if (error || !data) {
    return (
      <div className="page">
        <div className="empty-state error">Referral not found.</div>
        <Link to="/app/referrals">← Back</Link>
      </div>
    );
  }

  const statusLabel = REFERRAL_STATUSES.find((s) => s.value === data.status)?.label ?? data.status;

  return (
    <div className="page">
      <Link to="/app/referrals" className="btn btn-ghost" style={{ marginBottom: "1rem" }}>
        ← Back to referrals
      </Link>

      <div className="card">
        <div className="card-header">Referral #{data.id}</div>
        <div className="card-body">
          <dl className="detail-grid">
            <dt>Patient</dt>
            <dd>{data.patient_name}</dd>
            <dt>Email</dt>
            <dd>{data.patient_email}</dd>
            <dt>Clinic</dt>
            <dd>{data.clinic_name ?? "—"}</dd>
            <dt>Status</dt>
            <dd>{statusLabel}</dd>
            <dt>Assigned therapist</dt>
            <dd>{data.assigned_therapist_name ?? "—"}</dd>
            <dt>Created</dt>
            <dd>{new Date(data.created_at).toLocaleString()}</dd>
            {data.reason && (
              <>
                <dt>Reason</dt>
                <dd>{data.reason}</dd>
              </>
            )}
          </dl>

          {isAdmin && (
            <div className="detail-actions">
              <div className="input-group">
                <label>Status</label>
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                  {data.allowed_transitions.map((st) => (
                    <button
                      key={st}
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => patchMutation.mutate({ status: st })}
                      disabled={patchMutation.isPending}
                    >
                      → {REFERRAL_STATUSES.find((s) => s.value === st)?.label ?? st}
                    </button>
                  ))}
                  {data.allowed_transitions.length === 0 && (
                    <span style={{ color: "var(--color-text-muted)" }}>No transitions</span>
                  )}
                </div>
                {statusError && <div className="input-error-message">{statusError}</div>}
              </div>
              <div className="input-group">
                <label>Assign therapist</label>
                <select
                  className="input"
                  value={data.assigned_therapist ?? ""}
                  onChange={(e) =>
                    patchMutation.mutate({
                      assigned_therapist: e.target.value ? parseInt(e.target.value, 10) : null,
                    })
                  }
                  disabled={patchMutation.isPending}
                  style={{ maxWidth: 300 }}
                >
                  <option value="">—</option>
                  {therapistList.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.display_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="card" style={{ marginTop: "1rem" }}>
        <div className="card-header">Questionnaires</div>
        <div className="card-body">
          {!data.questionnaires.length ? (
            <p style={{ color: "var(--color-text-muted)" }}>None</p>
          ) : (
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Score</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {data.questionnaires.map((q) => (
                    <tr key={q.id}>
                      <td>{q.type.toUpperCase()}</td>
                      <td>{q.score ?? "—"}</td>
                      <td>{new Date(q.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="card" style={{ marginTop: "1rem" }}>
        <div className="card-header">Notes</div>
        <div className="card-body">
          <div className="notes-thread">
            {data.notes.map((n) => (
              <div key={n.id} className="note-item">
                <div className="note-meta">
                  {n.author_email} · {new Date(n.created_at).toLocaleString()}
                </div>
                <div className="note-body">{n.body}</div>
              </div>
            ))}
          </div>
          <form
            onSubmit={handleSubmit((d) => {
              noteMutation.mutate(d.body);
              reset();
            })}
            style={{ marginTop: "1rem" }}
          >
            <div className="input-group">
              <label>Add note</label>
              <textarea
                className={`input ${errors.body ? "input-error" : ""}`}
                rows={2}
                {...register("body")}
                placeholder="Add a note…"
              />
              {errors.body && <div className="input-error-message">{errors.body.message}</div>}
            </div>
            <button type="submit" className="btn btn-primary" disabled={noteMutation.isPending}>
              Add note
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
