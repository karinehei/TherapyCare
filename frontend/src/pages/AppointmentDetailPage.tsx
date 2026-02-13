import { useState, useCallback, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import { ApiError } from "@/api/client";
import { useAuth } from "@/auth/AuthContext";
import { appointmentDetailSchema } from "@/api/schemas";

const AUTOSAVE_DELAY_MS = 3000;

export function AppointmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [noteBody, setNoteBody] = useState("");
  const [autosaveEnabled, setAutosaveEnabled] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);
  const [autosaveStatus, setAutosaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const { data, isLoading, error } = useQuery({
    queryKey: ["appointment", id],
    queryFn: async () => {
      const res = await api.get<unknown>(`/appointments/${id}/`);
      return appointmentDetailSchema.parse(res);
    },
    enabled: !!id,
  });

  const isTherapistForAppointment =
    data && user?.therapist_profile_id != null && data.therapist === user.therapist_profile_id;
  const noteMasked = data?.session_note?.body === "Note hidden";

  useEffect(() => {
    if (data?.session_note && !noteMasked) {
      setNoteBody(data.session_note.body);
    }
  }, [data?.session_note, noteMasked]);

  const saveNote = useCallback(
    async (body: string) => {
      if (!id || !body.trim()) return;
      const hasNote = !!data?.session_note && !noteMasked;
      try {
        if (hasNote) {
          await api.patch(`/appointments/${id}/note/`, { body });
        } else {
          await api.post(`/appointments/${id}/note/`, { body });
        }
        queryClient.invalidateQueries({ queryKey: ["appointment", id] });
        queryClient.invalidateQueries({ queryKey: ["appointments"] });
        setAutosaveStatus("saved");
        setTimeout(() => setAutosaveStatus("idle"), 2000);
      } catch (err) {
        setAutosaveStatus("error");
        setNoteError(err instanceof ApiError ? String(err.detail) : "Failed to save");
      }
    },
    [id, data?.session_note, noteMasked, queryClient]
  );

  const noteMutation = useMutation({
    mutationFn: (body: string) => saveNote(body),
    onMutate: async (body) => {
      await queryClient.cancelQueries({ queryKey: ["appointment", id] });
      const prev = queryClient.getQueryData(["appointment", id]);
      queryClient.setQueryData(["appointment", id], (old: unknown) => {
        if (old && typeof old === "object" && "session_note" in old) {
          const o = old as { session_note?: { id: number; body: string; created_at: string; updated_at: string } };
          return {
            ...o,
            session_note: o.session_note
              ? { ...o.session_note, body }
              : { id: 0, body, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
          };
        }
        return old;
      });
      return { prev };
    },
    onSuccess: () => setNoteError(null),
    onError: (err: unknown, _body, ctx) => {
      setNoteError(err instanceof ApiError ? String(err.detail) : "Failed to save");
      if (ctx?.prev) queryClient.setQueryData(["appointment", id], ctx.prev);
    },
  });

  useEffect(() => {
    if (!autosaveEnabled || !isTherapistForAppointment || noteMasked) return;
    const timer = setTimeout(() => {
      if (noteBody.trim() && noteBody !== data?.session_note?.body) {
        setAutosaveStatus("saving");
        saveNote(noteBody).finally(() => {});
      }
    }, AUTOSAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [noteBody, autosaveEnabled, isTherapistForAppointment, noteMasked, data?.session_note?.body, saveNote]);

  if (!id) return null;
  if (isLoading) {
    return (
      <div className="page">
        <div className="page-loading">Loading appointment…</div>
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="page">
        <div className="empty-state error">Appointment not found.</div>
        <Link to="/app/appointments" className="btn btn-ghost" style={{ marginTop: "1rem" }}>
          ← Back to appointments
        </Link>
      </div>
    );
  }

  return (
    <div className="page">
      <Link to="/app/appointments" className="btn btn-ghost" style={{ marginBottom: "1rem" }}>
        ← Back to appointments
      </Link>

      <div className="card">
        <div className="card-header">Appointment #{data.id}</div>
        <div className="card-body">
          <dl className="detail-grid">
            <dt>Patient</dt>
            <dd>
              <Link to={`/app/patients/${data.patient}`}>{data.patient_name}</Link>
            </dd>
            <dt>Therapist</dt>
            <dd>{data.therapist_name}</dd>
            <dt>Start</dt>
            <dd>{new Date(data.starts_at).toLocaleString()}</dd>
            <dt>End</dt>
            <dd>{new Date(data.ends_at).toLocaleString()}</dd>
            <dt>Status</dt>
            <dd>
              <span
                style={{
                  padding: "0.2rem 0.5rem",
                  borderRadius: 4,
                  background: "var(--color-bg)",
                  fontSize: "0.8125rem",
                }}
              >
                {data.status}
              </span>
            </dd>
          </dl>
        </div>
      </div>

      <div className="card" style={{ marginTop: "1rem" }}>
        <div className="card-header">Session note</div>
        <div className="card-body">
          {noteMasked ? (
            <div className="note-masked" style={{ color: "var(--color-text-muted)", fontStyle: "italic" }}>
              Note hidden
            </div>
          ) : isTherapistForAppointment ? (
            <>
              <div className="input-group">
                <label>Note (therapist only)</label>
                <textarea
                  className="input"
                  rows={8}
                  value={noteBody}
                  onChange={(e) => setNoteBody(e.target.value)}
                  placeholder="Enter session notes…"
                />
              </div>
              <div style={{ display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => noteMutation.mutate(noteBody)}
                  disabled={noteMutation.isPending}
                >
                  {noteMutation.isPending ? "Saving…" : data.session_note ? "Update note" : "Save note"}
                </button>
                <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={autosaveEnabled}
                    onChange={(e) => setAutosaveEnabled(e.target.checked)}
                  />
                  <span style={{ fontSize: "0.875rem" }}>Autosave</span>
                </label>
                {autosaveStatus === "saved" && (
                  <span style={{ fontSize: "0.8125rem", color: "var(--color-primary)" }}>Saved</span>
                )}
                {autosaveStatus === "saving" && (
                  <span style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)" }}>Saving…</span>
                )}
              </div>
              {noteError && <div className="input-error-message" style={{ marginTop: "0.5rem" }}>{noteError}</div>}
            </>
          ) : (
            data.session_note ? (
              <div className="note-body" style={{ whiteSpace: "pre-wrap" }}>{data.session_note.body}</div>
            ) : (
              <p style={{ color: "var(--color-text-muted)" }}>No session note yet.</p>
            )
          )}
        </div>
      </div>
    </div>
  );
}
