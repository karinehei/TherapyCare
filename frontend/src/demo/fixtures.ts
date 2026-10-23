import type {
  AppointmentDetail,
  AuditEvent,
  Clinic,
  Me,
  PatientDetail,
  ReferralDetail,
  TherapistDetail,
} from "@/api/schemas";
import type { DemoRole } from "./config";
import { demoDateTime, demoIsoNow, getDemoReferenceDate } from "./clock";
import { getAllowedTransitions } from "./transitions";

export const DEMO_USERS: Record<DemoRole, Me> = {
  help_seeker: {
    id: 101,
    email: "alex.seeker@example.invalid",
    role: "help_seeker",
    first_name: "Alex",
    last_name: "Seeker",
    phone: "+1-555-0101",
    is_staff: false,
    therapist_profile_id: null,
    date_joined: "2026-01-15T10:00:00.000Z",
  },
  clinic_admin: {
    id: 102,
    email: "jordan.admin@example.invalid",
    role: "clinic_admin",
    first_name: "Jordan",
    last_name: "Admin",
    phone: "+1-555-0102",
    is_staff: true,
    therapist_profile_id: null,
    date_joined: "2025-06-01T09:00:00.000Z",
  },
};

/** Patient owned by the help-seeker demo persona (for booking). */
export const HELP_SEEKER_PATIENT_ID = 1;

export interface DemoFixtures {
  clinics: Clinic[];
  therapists: TherapistDetail[];
  patients: PatientDetail[];
  referrals: ReferralDetail[];
  appointments: AppointmentDetail[];
  auditEvents: AuditEvent[];
  nextIds: {
    referral: number;
    patient: number;
    appointment: number;
    note: number;
    questionnaire: number;
    audit: number;
  };
}

function buildTherapists(createdAt: string): TherapistDetail[] {
  return [
    {
      id: 1,
      user: 201,
      user_email: "sam.rivera@example.invalid",
      display_name: "Sam Rivera, LCSW",
      bio: "Fictional clinician specializing in anxiety and CBT. Example portfolio profile only.",
      languages: ["English", "Spanish"],
      specialties: ["Anxiety", "CBT", "Depression"],
      price_min: 90,
      price_max: 140,
      remote_available: true,
      city: "Portland",
      created_at: createdAt,
      availability_slots: [
        {
          id: 1,
          weekday: 0,
          start_time: "09:00:00",
          end_time: "12:00:00",
          timezone: "America/Los_Angeles",
        },
        {
          id: 2,
          weekday: 2,
          start_time: "13:00:00",
          end_time: "17:00:00",
          timezone: "America/Los_Angeles",
        },
        {
          id: 3,
          weekday: 4,
          start_time: "10:00:00",
          end_time: "15:00:00",
          timezone: "America/Los_Angeles",
        },
      ],
      location: {
        id: 1,
        lat: "45.5152",
        lng: "-122.6784",
        address: "100 Example Ave, Portland, OR",
      },
      clinic: 1,
      updated_at: createdAt,
    },
    {
      id: 2,
      user: 202,
      user_email: "morgan.lee@example.invalid",
      display_name: "Morgan Lee, PhD",
      bio: "Fictional trauma-informed therapist. Portfolio demo data — not a real provider.",
      languages: ["English", "Mandarin"],
      specialties: ["PTSD", "Trauma", "EMDR"],
      price_min: 120,
      price_max: 180,
      remote_available: true,
      city: "Seattle",
      created_at: createdAt,
      availability_slots: [
        {
          id: 4,
          weekday: 1,
          start_time: "09:00:00",
          end_time: "16:00:00",
          timezone: "America/Los_Angeles",
        },
        {
          id: 5,
          weekday: 3,
          start_time: "11:00:00",
          end_time: "18:00:00",
          timezone: "America/Los_Angeles",
        },
      ],
      location: {
        id: 2,
        lat: "47.6062",
        lng: "-122.3321",
        address: "200 Demo Street, Seattle, WA",
      },
      clinic: 1,
      updated_at: createdAt,
    },
    {
      id: 3,
      user: 203,
      user_email: "casey.nguyen@example.invalid",
      display_name: "Casey Nguyen, LMFT",
      bio: "Fictional family and couples therapist for demo search filters.",
      languages: ["English", "Vietnamese"],
      specialties: ["Family Therapy", "Couples", "Adolescents"],
      price_min: 100,
      price_max: 160,
      remote_available: false,
      city: "Portland",
      created_at: createdAt,
      availability_slots: [
        {
          id: 6,
          weekday: 0,
          start_time: "14:00:00",
          end_time: "18:00:00",
          timezone: "America/Los_Angeles",
        },
        {
          id: 7,
          weekday: 4,
          start_time: "09:00:00",
          end_time: "12:00:00",
          timezone: "America/Los_Angeles",
        },
      ],
      location: null,
      clinic: 1,
      updated_at: createdAt,
    },
    {
      id: 4,
      user: 204,
      user_email: "riley.okafor@example.invalid",
      display_name: "Riley Okafor, LPC",
      bio: "Fictional clinician focusing on OCD and related concerns.",
      languages: ["English"],
      specialties: ["OCD", "Anxiety", "DBT"],
      price_min: 110,
      price_max: 150,
      remote_available: true,
      city: "Austin",
      created_at: createdAt,
      availability_slots: [
        {
          id: 8,
          weekday: 2,
          start_time: "09:00:00",
          end_time: "17:00:00",
          timezone: "America/Chicago",
        },
      ],
      location: {
        id: 3,
        lat: "30.2672",
        lng: "-97.7431",
        address: "50 Fiction Blvd, Austin, TX",
      },
      clinic: 1,
      updated_at: createdAt,
    },
  ];
}

export function createInitialFixtures(): DemoFixtures {
  // Ensure reference date is established for this session.
  getDemoReferenceDate();
  const createdAt = demoIsoNow();
  const therapists = buildTherapists(createdAt);

  const clinics: Clinic[] = [
    {
      id: 1,
      name: "Example Wellness Clinic",
      slug: "example-wellness",
      address: "100 Example Ave, Portland, OR",
      phone: "+1-555-0199",
      created_at: createdAt,
    },
  ];

  const referral1Status = "new";
  const referrals: ReferralDetail[] = [
    {
      id: 1,
      clinic: 1,
      patient_name: "Alex Seeker",
      patient_email: "alex.seeker@example.invalid",
      status: referral1Status,
      assigned_therapist: null,
      created_at: demoDateTime(-3, "10:00"),
      requester_user: DEMO_USERS.help_seeker.id,
      reason: "Looking for support with work-related stress (fictional demo).",
      updated_at: demoDateTime(-3, "10:00"),
      clinic_name: "Example Wellness Clinic",
      assigned_therapist_name: null,
      notes: [
        {
          id: 1,
          author: DEMO_USERS.clinic_admin.id,
          author_email: DEMO_USERS.clinic_admin.email,
          body: "Demo intake note: fictional screening complete.",
          created_at: demoDateTime(-2, "14:30"),
        },
      ],
      questionnaires: [
        {
          id: 1,
          type: "phq9",
          answers: {
            q1: 1,
            q2: 1,
            q3: 0,
            q4: 1,
            q5: 0,
            q6: 0,
            q7: 0,
            q8: 0,
            q9: 0,
          },
          score: 3,
          created_at: demoDateTime(-3, "10:05"),
        },
      ],
      allowed_transitions: getAllowedTransitions(referral1Status),
    },
    {
      id: 2,
      clinic: 1,
      patient_name: "Taylor Brooks",
      patient_email: "taylor.brooks@example.invalid",
      status: "approved",
      assigned_therapist: 1,
      created_at: demoDateTime(-10, "09:00"),
      requester_user: DEMO_USERS.clinic_admin.id,
      reason: "Fictional referral for anxiety support.",
      updated_at: demoDateTime(-5, "11:00"),
      clinic_name: "Example Wellness Clinic",
      assigned_therapist_name: therapists[0].display_name,
      notes: [],
      questionnaires: [],
      allowed_transitions: getAllowedTransitions("approved"),
    },
  ];

  const appointments: AppointmentDetail[] = [
    {
      id: 1,
      patient: 2,
      patient_name: "Taylor Brooks",
      therapist: 1,
      therapist_name: therapists[0].display_name,
      starts_at: demoDateTime(1, "09:00"),
      ends_at: demoDateTime(1, "10:00"),
      status: "booked",
      created_at: demoDateTime(-4, "12:00"),
      updated_at: demoDateTime(-4, "12:00"),
      session_note: null,
    },
    {
      id: 2,
      patient: 1,
      patient_name: "Alex Seeker",
      therapist: 2,
      therapist_name: therapists[1].display_name,
      starts_at: demoDateTime(3, "11:00"),
      ends_at: demoDateTime(3, "12:00"),
      status: "booked",
      created_at: demoDateTime(-1, "16:00"),
      updated_at: demoDateTime(-1, "16:00"),
      session_note: null,
    },
  ];

  const patients: PatientDetail[] = [
    {
      id: HELP_SEEKER_PATIENT_ID,
      name: "Alex Seeker",
      email: "alex.seeker@example.invalid",
      clinic: 1,
      clinic_name: "Example Wellness Clinic",
      owner_therapist: 2,
      owner_therapist_name: therapists[1].display_name,
      created_at: demoDateTime(-3, "10:10"),
      referral: 1,
      phone: "+1-555-0101",
      consent_flags: { demo: true },
      referral_timeline: {
        id: 1,
        status: "new",
        created_at: demoDateTime(-3, "10:00"),
        questionnaires: [
          {
            id: 1,
            type: "phq9",
            score: 3,
            created_at: demoDateTime(-3, "10:05"),
          },
        ],
        note_count: 1,
      },
      appointments_timeline: [
        {
          id: 2,
          starts_at: appointments[1].starts_at,
          ends_at: appointments[1].ends_at,
          status: "booked",
          therapist_name: therapists[1].display_name,
        },
      ],
    },
    {
      id: 2,
      name: "Taylor Brooks",
      email: "taylor.brooks@example.invalid",
      clinic: 1,
      clinic_name: "Example Wellness Clinic",
      owner_therapist: 1,
      owner_therapist_name: therapists[0].display_name,
      created_at: demoDateTime(-10, "09:30"),
      referral: 2,
      phone: "+1-555-0144",
      consent_flags: { demo: true },
      referral_timeline: {
        id: 2,
        status: "approved",
        created_at: demoDateTime(-10, "09:00"),
        questionnaires: [],
        note_count: 0,
      },
      appointments_timeline: [
        {
          id: 1,
          starts_at: appointments[0].starts_at,
          ends_at: appointments[0].ends_at,
          status: "booked",
          therapist_name: therapists[0].display_name,
        },
      ],
    },
  ];

  const auditEvents: AuditEvent[] = [
    {
      id: "demo-audit-1",
      actor: DEMO_USERS.clinic_admin.id,
      action: "create",
      entity_type: "referral",
      entity_id: "1",
      metadata: { demo: true },
      ip: "127.0.0.1",
      user_agent: "TherapyCare Pages Demo",
      created_at: demoDateTime(-3, "10:00"),
    },
    {
      id: "demo-audit-2",
      actor: DEMO_USERS.clinic_admin.id,
      action: "update",
      entity_type: "referral",
      entity_id: "2",
      metadata: { status: "approved", demo: true },
      ip: "127.0.0.1",
      user_agent: "TherapyCare Pages Demo",
      created_at: demoDateTime(-5, "11:00"),
    },
    {
      id: "demo-audit-3",
      actor: DEMO_USERS.clinic_admin.id,
      action: "create",
      entity_type: "appointment",
      entity_id: "1",
      metadata: { demo: true },
      ip: "127.0.0.1",
      user_agent: "TherapyCare Pages Demo",
      created_at: demoDateTime(-4, "12:00"),
    },
  ];

  return {
    clinics,
    therapists,
    patients,
    referrals,
    appointments,
    auditEvents,
    nextIds: {
      referral: 3,
      patient: 3,
      appointment: 3,
      note: 2,
      questionnaire: 2,
      audit: 4,
    },
  };
}
