import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import { therapistDetailSchema } from "@/api/schemas";
import { useAuth } from "@/auth/AuthContext";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function TherapistDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  const { data, isLoading, error } = useQuery({
    queryKey: ["therapist", id],
    queryFn: async () => {
      const res = await api.get<unknown>(`/therapists/${id}/`);
      return therapistDetailSchema.parse(res);
    },
    enabled: !!id,
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
    ? "/app/referrals"
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
                {user ? "Request appointment" : "Login to request appointment"}
              </Link>
            </div>
          </div>
        </div>

        {data.availability_slots.length > 0 && (
          <div className="card availability-card">
            <div className="card-header">Availability</div>
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
      </div>
    </div>
  );
}
