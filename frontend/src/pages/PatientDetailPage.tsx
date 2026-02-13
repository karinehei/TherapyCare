import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import { ApiError } from "@/api/client";
import { useAuth } from "@/auth/AuthContext";
import { patientDetailSchema } from "@/api/schemas";
import { REFERRAL_STATUSES } from "@/referrals/constants";

export function PatientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showBookForm, setShowBookForm] = useState(false);
  const [bookTherapist, setBookTherapist] = useState("");
  const [bookDate, setBookDate] = useState("");
  const [bookStart, setBookStart] = useState("09:00");
  const [bookEnd, setBookEnd] = useState("10:00");
  const [bookError, setBookError] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["patient", id],
    queryFn: async () => {
      const res = await api.get<unknown>(`/patients/${id}/`);
      return patientDetailSchema.parse(res);
    },
    enabled: !!id,
  });

  const { data: therapistsRes } = useQuery({
    queryKey: ["therapists"],
    queryFn: () => api.get<{ results?: { id: number; display_name: string }[] }>("/therapists/"),
    enabled: !!id && (user?.role === "clinic_admin" || user?.role === "therapist" || user?.is_staff),
  });
  const therapistList = therapistsRes?.results ?? [];

  const bookMutation = useMutation({
    mutationFn: async () => {
      if (!id || !bookTherapist || !bookDate || !bookStart || !bookEnd) return;
      const starts_at = `${bookDate}T${bookStart}:00`;
      const ends_at = `${bookDate}T${bookEnd}:00`;
      await api.post("/appointments/", {
        patient: parseInt(id, 10),
        therapist: parseInt(bookTherapist, 10),
        starts_at,
        ends_at,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient", id] });
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      setShowBookForm(false);
      setBookError(null);
    },
    onError: (err: unknown) => {
      setBookError(err instanceof ApiError ? String(err.detail) : "Failed to book");
    },
  });

  const canBook = user?.role === "clinic_admin" || user?.role === "therapist" || user?.is_staff;

  if (!id) return null;
  if (isLoading) {
    return (
      <div className="page">
        <div className="page-loading">Loading patient…</div>
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="page">
        <div className="empty-state error">Patient not found.</div>
        <Link to="/app/patients" className="btn btn-ghost" style={{ marginTop: "1rem" }}>
          ← Back to patients
        </Link>
      </div>
    );
  }

  const referral = data.referral_timeline ?? null;
  const statusLabel = referral ? REFERRAL_STATUSES.find((s) => s.value === referral.status)?.label ?? referral.status : null;

  return (
    <div className="page">
      <Link to="/app/patients" className="btn btn-ghost" style={{ marginBottom: "1rem" }}>
        ← Back to patients
      </Link>

      <div className="card">
        <div className="card-header">{data.name}</div>
        <div className="card-body">
          <dl className="detail-grid">
            <dt>Email</dt>
            <dd>{data.email}</dd>
            <dt>Phone</dt>
            <dd>{data.phone || "—"}</dd>
            <dt>Clinic</dt>
            <dd>{data.clinic_name}</dd>
            <dt>Owner therapist</dt>
            <dd>{data.owner_therapist_name}</dd>
            <dt>Created</dt>
            <dd>{new Date(data.created_at).toLocaleString()}</dd>
          </dl>
        </div>
      </div>

      {/* Timeline */}
      <div className="patient-timeline" style={{ marginTop: "1.5rem" }}>
        {/* Referral */}
        {referral && (
          <div className="card" style={{ marginBottom: "1rem" }}>
            <div className="card-header">Referral #{referral.id}</div>
            <div className="card-body">
              <dl className="detail-grid">
                <dt>Status</dt>
                <dd>{statusLabel}</dd>
                <dt>Created</dt>
                <dd>{new Date(referral.created_at).toLocaleString()}</dd>
                <dt>Notes</dt>
                <dd>{referral.note_count}</dd>
              </dl>
              <Link to={`/app/referrals/${referral.id}`} className="btn btn-ghost" style={{ marginTop: "0.5rem" }}>
                View referral →
              </Link>
              {referral.questionnaires.length > 0 && (
                <div style={{ marginTop: "1rem" }}>
                  <h4 style={{ margin: "0 0 0.5rem", fontSize: "0.875rem", color: "var(--color-text-muted)" }}>Questionnaires</h4>
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
                        {referral.questionnaires.map((q) => (
                          <tr key={q.id}>
                            <td>{q.type.toUpperCase()}</td>
                            <td>{q.score ?? "—"}</td>
                            <td>{new Date(q.created_at).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Appointments */}
        <div className="card">
          <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            Appointments
            {canBook && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setShowBookForm(!showBookForm)}
              >
                {showBookForm ? "Cancel" : "Book appointment"}
              </button>
            )}
          </div>
          <div className="card-body">
            {showBookForm && canBook && (
              <div className="card" style={{ marginBottom: "1rem", background: "var(--color-bg)" }}>
                <div className="card-body">
                  <h4 style={{ margin: "0 0 1rem" }}>New appointment</h4>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", alignItems: "flex-end" }}>
                    <div className="input-group" style={{ marginBottom: 0 }}>
                      <label>Therapist</label>
                      <select
                        className="input"
                        value={bookTherapist}
                        onChange={(e) => setBookTherapist(e.target.value)}
                        style={{ minWidth: 180 }}
                      >
                        <option value="">Select…</option>
                        {therapistList.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.display_name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="input-group" style={{ marginBottom: 0 }}>
                      <label>Date</label>
                      <input
                        type="date"
                        className="input"
                        value={bookDate}
                        onChange={(e) => setBookDate(e.target.value)}
                      />
                    </div>
                    <div className="input-group" style={{ marginBottom: 0 }}>
                      <label>Start</label>
                      <input
                        type="time"
                        className="input"
                        value={bookStart}
                        onChange={(e) => setBookStart(e.target.value)}
                      />
                    </div>
                    <div className="input-group" style={{ marginBottom: 0 }}>
                      <label>End</label>
                      <input
                        type="time"
                        className="input"
                        value={bookEnd}
                        onChange={(e) => setBookEnd(e.target.value)}
                      />
                    </div>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => bookMutation.mutate()}
                      disabled={bookMutation.isPending || !bookTherapist || !bookDate}
                    >
                      {bookMutation.isPending ? "Booking…" : "Book"}
                    </button>
                  </div>
                  {bookError && <div className="input-error-message" style={{ marginTop: "0.5rem" }}>{bookError}</div>}
                </div>
              </div>
            )}
            {!data.appointments_timeline.length ? (
              <p style={{ color: "var(--color-text-muted)" }}>No appointments yet.</p>
            ) : (
              <div className="table-wrapper">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Time</th>
                      <th>Therapist</th>
                      <th>Status</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.appointments_timeline.map((a) => (
                      <tr key={a.id}>
                        <td>{new Date(a.starts_at).toLocaleDateString()}</td>
                        <td>
                          {new Date(a.starts_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}–
                          {new Date(a.ends_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </td>
                        <td>{a.therapist_name}</td>
                        <td>
                          <span
                            style={{
                              padding: "0.2rem 0.5rem",
                              borderRadius: 4,
                              background: "var(--color-bg)",
                              fontSize: "0.8125rem",
                            }}
                          >
                            {a.status}
                          </span>
                        </td>
                        <td>
                          <Link to={`/app/appointments/${a.id}`}>View</Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
