import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import { paginatedSchema, appointmentListSchema } from "@/api/schemas";
import type { AppointmentList } from "@/api/schemas";

const schema = paginatedSchema(appointmentListSchema);

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getWeekStart(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day;
  return new Date(date.setDate(diff));
}

function getWeekRange(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });
}

function groupByDay(appointments: AppointmentList[]): Record<string, AppointmentList[]> {
  return appointments.reduce<Record<string, AppointmentList[]>>((acc, a) => {
    const key = new Date(a.starts_at).toISOString().slice(0, 10);
    (acc[key] = acc[key] ?? []).push(a);
    return acc;
  }, {});
}

function toDateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function AppointmentsPage() {
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));

  const { data, isLoading, error } = useQuery({
    queryKey: ["appointments"],
    queryFn: async () => {
      const res = await api.get<unknown>("/appointments/?page_size=100");
      return schema.parse(res);
    },
  });

  const results = data?.results ?? [];
  const byDay = useMemo(() => groupByDay(results), [results]);
  const weekDays = useMemo(() => getWeekRange(weekStart), [weekStart]);

  const goPrevWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() - 7);
    setWeekStart(d);
  };
  const goNextWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 7);
    setWeekStart(d);
  };
  const goToday = () => setWeekStart(getWeekStart(new Date()));

  if (isLoading) {
    return (
      <div className="page">
        <div className="page-loading">Loading appointments…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page">
        <div className="empty-state error">Failed to load appointments.</div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header" style={{ display: "flex", flexWrap: "wrap", gap: "1rem", alignItems: "center" }}>
        <div>
          <h1 className="page-title">Appointments</h1>
          <p className="page-subtitle">{data?.count ?? 0} appointment(s)</p>
        </div>
        <div className="calendar-nav" style={{ marginLeft: "auto", display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <button type="button" className="btn btn-ghost" onClick={goPrevWeek}>
            ← Prev
          </button>
          <button type="button" className="btn btn-ghost" onClick={goToday}>
            Today
          </button>
          <button type="button" className="btn btn-ghost" onClick={goNextWeek}>
            Next →
          </button>
          <span style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)", marginLeft: "0.5rem" }}>
            {weekDays[0].toLocaleDateString()} – {weekDays[6].toLocaleDateString()}
          </span>
        </div>
      </div>

      <div className="card calendar-card">
        <div className="calendar-grid">
          {weekDays.map((day: Date) => {
            const key = toDateKey(day);
            const dayAppointments = (byDay[key] ?? []).sort(
              (a: AppointmentList, b: AppointmentList) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
            );
            return (
              <div key={key} className="calendar-day-column">
                <div className="calendar-day-header">
                  <div className="calendar-day-name">{WEEKDAYS[day.getDay()]}</div>
                  <div className="calendar-day-date">{day.getDate()}</div>
                </div>
                <div className="calendar-day-slots">
                  {dayAppointments.length === 0 ? (
                    <div className="calendar-empty">No appointments</div>
                  ) : (
                    dayAppointments.map((a) => (
                      <Link
                        key={a.id}
                        to={`/app/appointments/${a.id}`}
                        className="calendar-slot"
                      >
                        <div className="calendar-slot-time">
                          {new Date(a.starts_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                          –
                          {new Date(a.ends_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                        <div className="calendar-slot-patient">{a.patient_name}</div>
                        <div className="calendar-slot-therapist">{a.therapist_name}</div>
                        <span
                          className="calendar-slot-status"
                          style={{
                            padding: "0.15rem 0.4rem",
                            borderRadius: 4,
                            background: "var(--color-bg)",
                            fontSize: "0.75rem",
                          }}
                        >
                          {a.status}
                        </span>
                      </Link>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <style>{`
        .calendar-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 0;
          min-height: 300px;
        }
        @media (max-width: 900px) {
          .calendar-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (max-width: 600px) {
          .calendar-grid {
            grid-template-columns: 1fr;
          }
        }
        .calendar-day-column {
          border-right: 1px solid var(--color-border);
          min-width: 0;
        }
        .calendar-day-column:last-child {
          border-right: none;
        }
        .calendar-day-header {
          padding: 0.75rem;
          background: var(--color-bg);
          border-bottom: 1px solid var(--color-border);
          text-align: center;
        }
        .calendar-day-name {
          font-size: 0.75rem;
          color: var(--color-text-muted);
          text-transform: uppercase;
        }
        .calendar-day-date {
          font-weight: 600;
          font-size: 1.125rem;
        }
        .calendar-day-slots {
          padding: 0.5rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .calendar-empty {
          font-size: 0.8125rem;
          color: var(--color-text-muted);
          padding: 1rem;
          text-align: center;
        }
        .calendar-slot {
          display: block;
          padding: 0.5rem;
          background: var(--color-bg);
          border-radius: var(--radius);
          border: 1px solid var(--color-border);
          text-decoration: none;
          color: inherit;
          font-size: 0.8125rem;
          transition: border-color 0.15s;
        }
        .calendar-slot:hover {
          border-color: var(--color-primary);
        }
        .calendar-slot-time {
          font-weight: 600;
          margin-bottom: 0.25rem;
        }
        .calendar-slot-patient {
          color: var(--color-text);
        }
        .calendar-slot-therapist {
          color: var(--color-text-muted);
          font-size: 0.75rem;
          margin-top: 0.25rem;
        }
        .calendar-slot-status {
          display: inline-block;
          margin-top: 0.25rem;
        }
      `}</style>
    </div>
  );
}
