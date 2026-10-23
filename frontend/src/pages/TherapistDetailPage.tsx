import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import { ApiError } from "@/api/client";
import { therapistDetailSchema } from "@/api/schemas";
import { useAuth } from "@/auth/AuthContext";
import { isDemoMode } from "@/demo/config";
import { getAvailableSlotsForTherapist } from "@/demo/handlers";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function TherapistDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [bookMessage, setBookMessage] = useState<string | null>(null);
  const [bookError, setBookError] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["therapist", id],
    queryFn: async () => {
      const res = await api.get<unknown>(`/therapists/${id}/`);
      return therapistDetailSchema.parse(res);
    },
    enabled: !!id,
  });

  const openSlots =
    isDemoMode && id ? getAvailableSlotsForTherapist(parseInt(id, 10)) : [];

  const bookMutation = useMutation({
    mutationFn: async (slot: { starts_at: string; ends_at: string }) => {
      if (!id) return;
      return api.post("/demo/book", {
        therapist: parseInt(id, 10),
        starts_at: slot.starts_at,
        ends_at: slot.ends_at,
      });
    },
    onSuccess: () => {
      setBookMessage("Demo appointment booked.");
      setBookError(null);
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      queryClient.invalidateQueries({ queryKey: ["patient"] });
      queryClient.invalidateQueries({ queryKey: ["therapist", id] });
    },
    onError: (err: unknown) => {
      setBookMessage(null);
      setBookError(
        err instanceof ApiError ? String(err.detail) : "Booking failed"
      );
    },
  });

  if (!id) return null;

  if (isLoading) {
    return (
      <div className="page">
        <div className="page-loading">Loading…</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="page">
        <div className="empty-state error">
          Therapist not found or failed to load.
        </div>
        <Link to="/">← Back to search</Link>
      </div>
    );
  }

  const requestUrl = user
    ? "/app/referrals/new"
    : `/login?next=${encodeURIComponent(`/therapists/${id}`)}`;

  return (
    <div className="page">
      <Link to="/" className="btn btn-ghost" style={{ marginBottom: "1rem" }}>
        ← Back to search
      </Link>

      <div className="therapist-detail">
        <div className="card">
          <div className="card-header">{data.display_name}</div>
          <div className="card-body">
            <p className="page-subtitle" style={{ marginTop: 0 }}>
              {data.specialties.join(" • ")} {data.city && `• ${data.city}`}
            </p>
            {data.bio && <p style={{ margin: "1rem 0" }}>{data.bio}</p>}
            <div className="therapist-detail-meta">
              <p>
                <strong>Languages:</strong> {data.languages.join(", ") || "—"}
              </p>
              <p>
                <strong>Remote:</strong> {data.remote_available ? "Yes" : "No"}
              </p>
              {(data.price_min || data.price_max) && (
                <p>
                  <strong>Price:</strong>{" "}
                  {data.price_min && data.price_max
                    ? `$${data.price_min}–$${data.price_max}`
                    : data.price_min
                      ? `From $${data.price_min}`
                      : `Up to $${data.price_max}`}
                </p>
              )}
            </div>

            <div className="therapist-actions">
              <Link to={requestUrl} className="btn btn-primary">
                {user
                  ? "Request appointment (referral)"
                  : "Login to request appointment"}
              </Link>
              {user && (
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => navigate("/app/appointments")}
                >
                  View appointments
                </button>
              )}
            </div>
          </div>
        </div>

        {data.availability_slots.length > 0 && (
          <div className="card availability-card">
            <div className="card-header">Weekly availability</div>
            <div className="card-body">
              <div className="availability-grid">
                {data.availability_slots.map((slot) => (
                  <div key={slot.id} className="availability-slot">
                    <span className="availability-day">
                      {WEEKDAYS[slot.weekday] ?? `Day ${slot.weekday}`}
                    </span>
                    <span className="availability-time">
                      {slot.start_time}–{slot.end_time}
                    </span>
                    <span className="availability-tz">{slot.timezone}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {isDemoMode && (
          <div className="card availability-card" style={{ marginTop: "1rem" }}>
            <div className="card-header">Open demo slots</div>
            <div className="card-body">
              <p
                style={{
                  marginTop: 0,
                  fontSize: "0.875rem",
                  color: "var(--color-text-muted)",
                }}
              >
                Simulated booking — confirms locally and frees the slot if you
                cancel later.
              </p>
              {bookMessage && (
                <div
                  className="demo-success"
                  role="status"
                  style={{ marginBottom: "0.75rem" }}
                >
                  {bookMessage}
                </div>
              )}
              {bookError && (
                <div
                  className="input-error-message"
                  style={{ marginBottom: "0.75rem" }}
                >
                  {bookError}
                </div>
              )}
              {!user ? (
                <p>
                  <Link
                    to={`/login?next=${encodeURIComponent(`/therapists/${id}`)}`}
                  >
                    Enter the demo
                  </Link>{" "}
                  to book a slot.
                </p>
              ) : openSlots.length === 0 ? (
                <p style={{ color: "var(--color-text-muted)" }}>
                  No open slots in the next two weeks (or all are booked).
                </p>
              ) : (
                <ul className="demo-slot-list">
                  {openSlots.map((slot) => (
                    <li key={slot.starts_at}>
                      <span>
                        {new Date(slot.starts_at).toLocaleString(undefined, {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      <button
                        type="button"
                        className="btn btn-primary"
                        disabled={bookMutation.isPending}
                        onClick={() => bookMutation.mutate(slot)}
                      >
                        Book
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
