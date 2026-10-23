import { ApiError } from "@/api/errors";
import type { RequestOptions } from "@/api/types";
import type {
  AppointmentDetail,
  Me,
  PatientDetail,
  ReferralDetail,
  TherapistDetail,
  TherapistList,
} from "@/api/schemas";
import { DEMO_USERS, HELP_SEEKER_PATIENT_ID } from "./fixtures";
import { demoIsoNow } from "./clock";
import { canTransition, getAllowedTransitions } from "./transitions";
import { getDemoRole, getDemoState, setDemoState } from "./store";
import type { DemoPersistedState } from "./store";

function paginate<T>(
  items: T[],
  page = 1,
  pageSize = 20
): {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
} {
  const start = (page - 1) * pageSize;
  const slice = items.slice(start, start + pageSize);
  return {
    count: items.length,
    next: start + pageSize < items.length ? `page=${page + 1}` : null,
    previous: page > 1 ? `page=${page - 1}` : null,
    results: slice,
  };
}

function parsePath(path: string): {
  pathname: string;
  searchParams: URLSearchParams;
} {
  const stripped = path.replace(/^\/api\/v1/, "").replace(/^\//, "");
  const [pathnamePart, query = ""] = stripped.split("?");
  const pathname = pathnamePart.replace(/\/$/, "") || "";
  return { pathname, searchParams: new URLSearchParams(query) };
}

function parseBody(options: RequestOptions): Record<string, unknown> {
  if (!options.body || typeof options.body !== "string") return {};
  try {
    return JSON.parse(options.body) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function requireRole(): NonNullable<ReturnType<typeof getDemoRole>> {
  const role = getDemoRole();
  if (!role) {
    throw new ApiError(401, "Unauthorized", "Select a demo role to continue.");
  }
  return role;
}

function syncPatientTimelines(state: DemoPersistedState): DemoPersistedState {
  const patients = state.patients.map((p) => {
    const referral = state.referrals.find((r) => r.id === p.referral);
    const appts = state.appointments
      .filter((a) => a.patient === p.id)
      .map((a) => ({
        id: a.id,
        starts_at: a.starts_at,
        ends_at: a.ends_at,
        status: a.status,
        therapist_name: a.therapist_name,
      }));
    return {
      ...p,
      referral_timeline: referral
        ? {
            id: referral.id,
            status: referral.status,
            created_at: referral.created_at,
            questionnaires: referral.questionnaires.map((q) => ({
              id: q.id,
              type: q.type,
              score: q.score,
              created_at: q.created_at,
            })),
            note_count: referral.notes.length,
          }
        : null,
      appointments_timeline: appts,
    };
  });
  return { ...state, patients };
}

function appendAudit(
  state: DemoPersistedState,
  action: string,
  entityType: string,
  entityId: string | number,
  metadata: Record<string, unknown> = {}
): DemoPersistedState {
  const role = state.role;
  const actor = role ? DEMO_USERS[role].id : null;
  const id = `demo-audit-${state.nextIds.audit}`;
  return {
    ...state,
    nextIds: { ...state.nextIds, audit: state.nextIds.audit + 1 },
    auditEvents: [
      {
        id,
        actor,
        action,
        entity_type: entityType,
        entity_id: String(entityId),
        metadata: { ...metadata, demo: true },
        ip: "127.0.0.1",
        user_agent: "TherapyCare Pages Demo",
        created_at: demoIsoNow(),
      },
      ...state.auditEvents,
    ],
  };
}

function therapistListItem(t: TherapistDetail): TherapistList {
  return {
    id: t.id,
    user: t.user,
    user_email: t.user_email,
    display_name: t.display_name,
    bio: t.bio,
    languages: t.languages,
    specialties: t.specialties,
    price_min: t.price_min,
    price_max: t.price_max,
    remote_available: t.remote_available,
    city: t.city,
    created_at: t.created_at,
  };
}

function overlaps(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string
): boolean {
  const as = new Date(aStart).getTime();
  const ae = new Date(aEnd).getTime();
  const bs = new Date(bStart).getTime();
  const be = new Date(bEnd).getTime();
  return as < be && bs < ae;
}

function filterTherapists(
  therapists: TherapistDetail[],
  params: URLSearchParams
): TherapistDetail[] {
  let list = [...therapists];
  const q = (params.get("q") ?? "").toLowerCase().trim();
  const specialty = params.get("specialty") ?? "";
  const language = params.get("language") ?? "";
  const city = (params.get("city") ?? "").toLowerCase().trim();
  const remote = params.get("remote") === "true";
  const priceMin = params.get("price_min")
    ? Number(params.get("price_min"))
    : null;
  const priceMax = params.get("price_max")
    ? Number(params.get("price_max"))
    : null;

  if (q) {
    list = list.filter(
      (t) =>
        t.display_name.toLowerCase().includes(q) ||
        t.specialties.some((s) => s.toLowerCase().includes(q)) ||
        t.bio.toLowerCase().includes(q)
    );
  }
  if (specialty) {
    list = list.filter((t) => t.specialties.includes(specialty));
  }
  if (language) {
    list = list.filter((t) => t.languages.includes(language));
  }
  if (city) {
    list = list.filter((t) => t.city.toLowerCase().includes(city));
  }
  if (remote) {
    list = list.filter((t) => t.remote_available);
  }
  if (priceMin != null && !Number.isNaN(priceMin)) {
    list = list.filter((t) => t.price_max == null || t.price_max >= priceMin);
  }
  if (priceMax != null && !Number.isNaN(priceMax)) {
    list = list.filter((t) => t.price_min == null || t.price_min <= priceMax);
  }
  return list;
}

function visibleReferrals(
  state: DemoPersistedState,
  role: string
): ReferralDetail[] {
  if (role === "help_seeker") {
    return state.referrals.filter(
      (r) =>
        r.requester_user === DEMO_USERS.help_seeker.id ||
        r.patient_email === DEMO_USERS.help_seeker.email
    );
  }
  return state.referrals;
}

function visiblePatients(
  state: DemoPersistedState,
  role: string
): PatientDetail[] {
  if (role === "help_seeker") {
    return state.patients.filter((p) => p.id === HELP_SEEKER_PATIENT_ID);
  }
  return state.patients;
}

function visibleAppointments(
  state: DemoPersistedState,
  role: string
): AppointmentDetail[] {
  if (role === "help_seeker") {
    return state.appointments.filter(
      (a) => a.patient === HELP_SEEKER_PATIENT_ID
    );
  }
  return state.appointments;
}

function demoUnsupported(feature: string): never {
  throw new ApiError(
    501,
    "Not implemented in demo",
    `Demo mode: ${feature} is not available in this portfolio demo. See the repository README and docs/ screenshots for the full Django application.`
  );
}

async function handleGet(
  pathname: string,
  params: URLSearchParams
): Promise<unknown> {
  if (pathname === "me") {
    const role = requireRole();
    return DEMO_USERS[role] satisfies Me;
  }

  if (pathname === "therapists") {
    const state = getDemoState();
    const filtered = filterTherapists(state.therapists, params);
    const page = parseInt(params.get("page") ?? "1", 10) || 1;
    const pageSize = parseInt(params.get("page_size") ?? "20", 10) || 20;
    return paginate(filtered.map(therapistListItem), page, pageSize);
  }

  const therapistMatch = /^therapists\/(\d+)$/.exec(pathname);
  if (therapistMatch) {
    const id = parseInt(therapistMatch[1], 10);
    const t = getDemoState().therapists.find((x) => x.id === id);
    if (!t) throw new ApiError(404, "Not found", "Therapist not found.");
    return t;
  }

  if (pathname === "clinics") {
    requireRole();
    return paginate(getDemoState().clinics, 1, 100);
  }

  if (pathname === "referrals") {
    const role = requireRole();
    let list = visibleReferrals(getDemoState(), role);
    const status = params.get("status");
    if (status) list = list.filter((r) => r.status === status);
    return paginate(
      list.map((r) => ({
        id: r.id,
        clinic: r.clinic,
        patient_name: r.patient_name,
        patient_email: r.patient_email,
        status: r.status,
        assigned_therapist: r.assigned_therapist,
        created_at: r.created_at,
      })),
      1,
      100
    );
  }

  const referralMatch = /^referrals\/(\d+)$/.exec(pathname);
  if (referralMatch) {
    const role = requireRole();
    const id = parseInt(referralMatch[1], 10);
    const r = visibleReferrals(getDemoState(), role).find((x) => x.id === id);
    if (!r) throw new ApiError(404, "Not found", "Referral not found.");
    return {
      ...r,
      allowed_transitions: getAllowedTransitions(r.status),
    };
  }

  if (pathname === "patients") {
    const role = requireRole();
    const list = visiblePatients(getDemoState(), role);
    return paginate(
      list.map((p) => ({
        id: p.id,
        name: p.name,
        email: p.email,
        clinic: p.clinic,
        clinic_name: p.clinic_name,
        owner_therapist: p.owner_therapist,
        owner_therapist_name: p.owner_therapist_name,
        created_at: p.created_at,
      })),
      1,
      100
    );
  }

  const patientMatch = /^patients\/(\d+)$/.exec(pathname);
  if (patientMatch) {
    const role = requireRole();
    const id = parseInt(patientMatch[1], 10);
    const p = visiblePatients(getDemoState(), role).find((x) => x.id === id);
    if (!p) throw new ApiError(404, "Not found", "Patient not found.");
    return p;
  }

  if (pathname === "appointments") {
    const role = requireRole();
    const list = visibleAppointments(getDemoState(), role);
    const pageSize = parseInt(params.get("page_size") ?? "100", 10) || 100;
    return paginate(
      list.map((a) => ({
        id: a.id,
        patient: a.patient,
        patient_name: a.patient_name,
        therapist: a.therapist,
        therapist_name: a.therapist_name,
        starts_at: a.starts_at,
        ends_at: a.ends_at,
        status: a.status,
        created_at: a.created_at,
      })),
      1,
      pageSize
    );
  }

  const appointmentMatch = /^appointments\/(\d+)$/.exec(pathname);
  if (appointmentMatch) {
    const role = requireRole();
    const id = parseInt(appointmentMatch[1], 10);
    const a = visibleAppointments(getDemoState(), role).find(
      (x) => x.id === id
    );
    if (!a) throw new ApiError(404, "Not found", "Appointment not found.");
    // Mask session notes for clinic admin (mirrors backend)
    if (role === "clinic_admin" && a.session_note) {
      return {
        ...a,
        session_note: { ...a.session_note, body: "Note hidden" },
      };
    }
    return a;
  }

  if (pathname === "audit/events") {
    const role = requireRole();
    if (role !== "clinic_admin") {
      throw new ApiError(
        403,
        "Forbidden",
        "Audit log is for clinic admin in this demo."
      );
    }
    return paginate(getDemoState().auditEvents, 1, 100);
  }

  demoUnsupported(`GET ${pathname}`);
}

async function handlePost(
  pathname: string,
  body: Record<string, unknown>
): Promise<unknown> {
  if (pathname === "referrals") {
    const role = requireRole();
    if (role !== "help_seeker" && role !== "clinic_admin") {
      throw new ApiError(
        403,
        "Forbidden",
        "Cannot create referrals in this role."
      );
    }
    const patient_name = String(body.patient_name ?? "").trim();
    const patient_email = String(body.patient_email ?? "").trim();
    if (!patient_name || !patient_email) {
      throw new ApiError(400, "Bad request", "Name and email are required.");
    }

    let createdId = 0;
    setDemoState((prev) => {
      const id = prev.nextIds.referral;
      createdId = id;
      const clinicId =
        typeof body.clinic === "number"
          ? body.clinic
          : body.clinic
            ? parseInt(String(body.clinic), 10)
            : null;
      const clinic =
        prev.clinics.find((c) => c.id === clinicId) ?? prev.clinics[0];
      const now = demoIsoNow();

      const questionnaires = [];
      let nextQ = prev.nextIds.questionnaire;
      if (body.questionnaire && typeof body.questionnaire === "object") {
        const q = body.questionnaire as {
          type: string;
          answers: Record<string, unknown>;
          score: number | null;
        };
        questionnaires.push({
          id: nextQ,
          type: q.type,
          answers: q.answers ?? {},
          score: q.score ?? null,
          created_at: now,
        });
        nextQ += 1;
      }

      const referral: ReferralDetail = {
        id,
        clinic: clinic?.id ?? null,
        patient_name,
        patient_email,
        status: "new",
        assigned_therapist: null,
        created_at: now,
        requester_user: DEMO_USERS[role].id,
        reason: String(body.reason ?? ""),
        updated_at: now,
        clinic_name: clinic?.name ?? null,
        assigned_therapist_name: null,
        notes: [],
        questionnaires,
        allowed_transitions: getAllowedTransitions("new"),
      };

      const patientId = prev.nextIds.patient;
      const patient: PatientDetail = {
        id: patientId,
        name: patient_name,
        email: patient_email,
        clinic: clinic?.id ?? 1,
        clinic_name: clinic?.name ?? "Example Wellness Clinic",
        owner_therapist: prev.therapists[0]?.id ?? 1,
        owner_therapist_name: prev.therapists[0]?.display_name ?? "Therapist",
        created_at: now,
        referral: id,
        phone: "",
        consent_flags: { demo: true },
        referral_timeline: {
          id,
          status: "new",
          created_at: now,
          questionnaires: questionnaires.map((q) => ({
            id: q.id,
            type: q.type,
            score: q.score,
            created_at: q.created_at,
          })),
          note_count: 0,
        },
        appointments_timeline: [],
      };

      let next = {
        ...prev,
        referrals: [referral, ...prev.referrals],
        patients: [patient, ...prev.patients],
        nextIds: {
          ...prev.nextIds,
          referral: id + 1,
          patient: patientId + 1,
          questionnaire: nextQ,
        },
      };
      next = appendAudit(next, "create", "referral", id, {
        message: "Demo referral created",
      });
      return syncPatientTimelines(next);
    });

    return { id: createdId };
  }

  const noteMatch = /^referrals\/(\d+)\/notes$/.exec(pathname);
  if (noteMatch) {
    const role = requireRole();
    const id = parseInt(noteMatch[1], 10);
    const bodyText = String(body.body ?? "").trim();
    if (!bodyText) {
      throw new ApiError(400, "Bad request", "Note is required.");
    }
    setDemoState((prev) => {
      const referrals = prev.referrals.map((r) => {
        if (r.id !== id) return r;
        const noteId = prev.nextIds.note;
        return {
          ...r,
          notes: [
            ...r.notes,
            {
              id: noteId,
              author: DEMO_USERS[role].id,
              author_email: DEMO_USERS[role].email,
              body: bodyText,
              created_at: demoIsoNow(),
            },
          ],
        };
      });
      let next = {
        ...prev,
        referrals,
        nextIds: { ...prev.nextIds, note: prev.nextIds.note + 1 },
      };
      next = appendAudit(next, "create", "referral_note", id);
      return syncPatientTimelines(next);
    });
    return { ok: true };
  }

  if (pathname === "appointments" || pathname === "demo/book") {
    const role = requireRole();
    const therapistId = Number(body.therapist);
    const starts_at = String(body.starts_at ?? "");
    const ends_at = String(body.ends_at ?? "");
    let patientId = Number(body.patient);

    if (pathname === "demo/book" || role === "help_seeker") {
      patientId = HELP_SEEKER_PATIENT_ID;
    }
    if (role === "help_seeker" && pathname === "appointments" && body.patient) {
      patientId = HELP_SEEKER_PATIENT_ID;
    }
    if (role !== "clinic_admin" && role !== "help_seeker") {
      throw new ApiError(
        403,
        "Forbidden",
        "Cannot book appointments in this role."
      );
    }
    if (role === "clinic_admin" && pathname === "appointments" && !patientId) {
      throw new ApiError(
        400,
        "Bad request",
        "patient, therapist, starts_at, and ends_at are required."
      );
    }

    if (!therapistId || !starts_at || !ends_at || !patientId) {
      throw new ApiError(
        400,
        "Bad request",
        "patient, therapist, starts_at, and ends_at are required."
      );
    }
    if (new Date(ends_at) <= new Date(starts_at)) {
      throw new ApiError(400, "Bad request", "ends_at must be after starts_at");
    }

    let created: AppointmentDetail | null = null;
    setDemoState((prev) => {
      const patient = prev.patients.find((p) => p.id === patientId);
      const therapist = prev.therapists.find((t) => t.id === therapistId);
      if (!patient || !therapist) {
        throw new ApiError(400, "Bad request", "Invalid patient or therapist.");
      }
      const conflict = prev.appointments.some(
        (a) =>
          a.therapist === therapistId &&
          a.status === "booked" &&
          overlaps(a.starts_at, a.ends_at, starts_at, ends_at)
      );
      if (conflict) {
        throw new ApiError(
          400,
          "Conflict",
          "Demo: that time overlaps an existing booked appointment for this therapist."
        );
      }
      const id = prev.nextIds.appointment;
      const now = demoIsoNow();
      created = {
        id,
        patient: patientId,
        patient_name: patient.name,
        therapist: therapistId,
        therapist_name: therapist.display_name,
        starts_at,
        ends_at,
        status: "booked",
        created_at: now,
        updated_at: now,
        session_note: null,
      };
      let next = {
        ...prev,
        appointments: [...prev.appointments, created!],
        nextIds: { ...prev.nextIds, appointment: id + 1 },
      };
      next = appendAudit(next, "create", "appointment", id, {
        message: "Demo appointment booked",
      });
      return syncPatientTimelines(next);
    });
    return created;
  }

  const apptNoteMatch = /^appointments\/(\d+)\/note$/.exec(pathname);
  if (apptNoteMatch) {
    demoUnsupported(
      "session notes (therapist-only in the full app; not editable in this portfolio demo)"
    );
  }

  demoUnsupported(`POST ${pathname}`);
}

async function handlePatch(
  pathname: string,
  body: Record<string, unknown>
): Promise<unknown> {
  const referralMatch = /^referrals\/(\d+)$/.exec(pathname);
  if (referralMatch) {
    const role = requireRole();
    if (role !== "clinic_admin") {
      throw new ApiError(
        403,
        "Forbidden",
        "Only clinic admin can update referrals in this demo."
      );
    }
    const id = parseInt(referralMatch[1], 10);
    let updated: ReferralDetail | null = null;

    setDemoState((prev) => {
      const current = prev.referrals.find((r) => r.id === id);
      if (!current) {
        throw new ApiError(404, "Not found", "Referral not found.");
      }
      if (body.status != null) {
        const to = String(body.status);
        if (!canTransition(current.status, to)) {
          throw new ApiError(
            400,
            "Invalid transition",
            `Demo: cannot change status from "${current.status}" to "${to}".`
          );
        }
      }
      const assignedId =
        body.assigned_therapist === null
          ? null
          : body.assigned_therapist != null
            ? Number(body.assigned_therapist)
            : current.assigned_therapist;
      const therapist = prev.therapists.find((t) => t.id === assignedId);
      const nextStatus =
        body.status != null ? String(body.status) : current.status;
      const referral: ReferralDetail = {
        ...current,
        status: nextStatus,
        assigned_therapist: assignedId,
        assigned_therapist_name: therapist?.display_name ?? null,
        updated_at: demoIsoNow(),
        allowed_transitions: getAllowedTransitions(nextStatus),
      };
      updated = referral;
      let next = {
        ...prev,
        referrals: prev.referrals.map((r) => (r.id === id ? referral : r)),
      };
      next = appendAudit(next, "update", "referral", id, {
        status: nextStatus,
        message: "Demo referral updated",
      });
      return syncPatientTimelines(next);
    });
    return updated;
  }

  const appointmentMatch = /^appointments\/(\d+)$/.exec(pathname);
  if (appointmentMatch) {
    const role = requireRole();
    if (role !== "clinic_admin" && role !== "help_seeker") {
      throw new ApiError(
        403,
        "Forbidden",
        "Cannot update appointments in this role."
      );
    }
    const id = parseInt(appointmentMatch[1], 10);
    let updated: AppointmentDetail | null = null;

    setDemoState((prev) => {
      const visible = visibleAppointments(prev, role);
      const current = visible.find((a) => a.id === id);
      if (!current) {
        throw new ApiError(404, "Not found", "Appointment not found.");
      }
      if (
        body.status != null &&
        body.status !== "cancelled" &&
        body.status !== "booked"
      ) {
        throw new ApiError(
          400,
          "Bad request",
          "Demo: only booked/cancelled statuses are supported."
        );
      }
      if (body.status === "cancelled" && current.status !== "booked") {
        throw new ApiError(
          400,
          "Bad request",
          "Demo: only booked appointments can be cancelled."
        );
      }
      const nextAppt: AppointmentDetail = {
        ...current,
        status: body.status != null ? String(body.status) : current.status,
        updated_at: demoIsoNow(),
      };
      updated = nextAppt;
      let next = {
        ...prev,
        appointments: prev.appointments.map((a) =>
          a.id === id ? nextAppt : a
        ),
      };
      next = appendAudit(next, "update", "appointment", id, {
        status: nextAppt.status,
        message:
          nextAppt.status === "cancelled"
            ? "Demo appointment cancelled"
            : "Demo appointment updated",
      });
      return syncPatientTimelines(next);
    });
    return updated;
  }

  const apptNoteMatch = /^appointments\/(\d+)\/note$/.exec(pathname);
  if (apptNoteMatch) {
    demoUnsupported(
      "session notes (therapist-only in the full app; not editable in this portfolio demo)"
    );
  }

  demoUnsupported(`PATCH ${pathname}`);
}

/**
 * In-process demo API. Never calls fetch.
 * Paths match those used by the shared client (relative to /api/v1) and auth helpers.
 */
export async function demoRequest<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const method = (options.method ?? "GET").toUpperCase();
  const { pathname, searchParams } = parsePath(path);
  const body = parseBody(options);

  // Tiny async boundary so callers behave like real network code.
  await Promise.resolve();

  if (method === "GET") {
    return (await handleGet(pathname, searchParams)) as T;
  }
  if (method === "POST") {
    return (await handlePost(pathname, body)) as T;
  }
  if (method === "PATCH") {
    return (await handlePatch(pathname, body)) as T;
  }
  if (method === "DELETE") {
    demoUnsupported(`DELETE ${pathname}`);
  }
  demoUnsupported(`${method} ${pathname}`);
}

/** Available open slots for a therapist over the next N days (demo UI). */
export function getAvailableSlotsForTherapist(
  therapistId: number,
  days = 14
): { starts_at: string; ends_at: string }[] {
  const state = getDemoState();
  const therapist = state.therapists.find((t) => t.id === therapistId);
  if (!therapist) return [];

  const slots: { starts_at: string; ends_at: string }[] = [];
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  for (let d = 1; d <= days; d++) {
    const day = new Date(start);
    day.setDate(day.getDate() + d);
    // JS getDay(): 0=Sun … Convert to Mon=0 … Sun=6 to match fixture weekdays
    const jsDay = day.getDay();
    const weekday = jsDay === 0 ? 6 : jsDay - 1;

    for (const avail of therapist.availability_slots) {
      if (avail.weekday !== weekday) continue;
      const [sh, sm] = avail.start_time.split(":").map(Number);
      const startDt = new Date(day);
      startDt.setHours(sh, sm || 0, 0, 0);
      const endDt = new Date(startDt);
      endDt.setHours(startDt.getHours() + 1);

      const starts_at = startDt.toISOString();
      const ends_at = endDt.toISOString();
      const taken = state.appointments.some(
        (a) =>
          a.therapist === therapistId &&
          a.status === "booked" &&
          overlaps(a.starts_at, a.ends_at, starts_at, ends_at)
      );
      if (!taken) {
        slots.push({ starts_at, ends_at });
      }
    }
  }
  return slots.slice(0, 12);
}
