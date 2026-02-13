import { z } from "zod";

// Auth
export const loginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password is required"),
});

export const meSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  role: z.string(),
  first_name: z.string(),
  last_name: z.string(),
  phone: z.string(),
  is_staff: z.boolean().optional(),
  therapist_profile_id: z.number().nullable().optional(),
  date_joined: z.string(),
});

// Paginated response
export const paginatedSchema = <T extends z.ZodType>(itemSchema: T) =>
  z.object({
    count: z.number(),
    next: z.string().nullable(),
    previous: z.string().nullable(),
    results: z.array(itemSchema),
  });

// Therapist
export const therapistListSchema = z.object({
  id: z.number(),
  user: z.number(),
  user_email: z.string().email(),
  display_name: z.string(),
  bio: z.string(),
  languages: z.array(z.string()),
  specialties: z.array(z.string()),
  price_min: z.number().nullable(),
  price_max: z.number().nullable(),
  remote_available: z.boolean(),
  city: z.string(),
  created_at: z.string(),
});

export const availabilitySlotSchema = z.object({
  id: z.number(),
  weekday: z.number(),
  start_time: z.string(),
  end_time: z.string(),
  timezone: z.string(),
});

export const locationSchema = z.object({
  id: z.number(),
  lat: z.string(),
  lng: z.string(),
  address: z.string(),
});

export const therapistDetailSchema = therapistListSchema.extend({
  availability_slots: z.array(availabilitySlotSchema),
  location: locationSchema.nullable(),
  clinic: z.number().nullable(),
  updated_at: z.string(),
});

// Clinic
export const clinicSchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  address: z.string(),
  phone: z.string(),
  created_at: z.string(),
});

// Referral
export const referralListSchema = z.object({
  id: z.number(),
  clinic: z.number().nullable(),
  patient_name: z.string(),
  patient_email: z.string(),
  status: z.string(),
  assigned_therapist: z.number().nullable(),
  created_at: z.string(),
});

export const referralNoteSchema = z.object({
  id: z.number(),
  author: z.number(),
  author_email: z.string(),
  body: z.string(),
  created_at: z.string(),
});

export const questionnaireSchema = z.object({
  id: z.number(),
  type: z.string(),
  answers: z.record(z.unknown()),
  score: z.number().nullable(),
  created_at: z.string(),
});

export const referralDetailSchema = referralListSchema.extend({
  requester_user: z.number().nullable(),
  reason: z.string(),
  updated_at: z.string(),
  clinic_name: z.string().nullable(),
  assigned_therapist_name: z.string().nullable(),
  notes: z.array(referralNoteSchema),
  questionnaires: z.array(questionnaireSchema),
  allowed_transitions: z.array(z.string()),
});

// Patient
export const patientListSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string(),
  clinic: z.number(),
  clinic_name: z.string(),
  owner_therapist: z.number(),
  owner_therapist_name: z.string(),
  created_at: z.string(),
});

export const referralTimelineSchema = z.object({
  id: z.number(),
  status: z.string(),
  created_at: z.string(),
  questionnaires: z.array(z.object({ id: z.number(), type: z.string(), score: z.number().nullable(), created_at: z.string() })),
  note_count: z.number(),
});

export const appointmentTimelineSchema = z.object({
  id: z.number(),
  starts_at: z.string(),
  ends_at: z.string(),
  status: z.string(),
  therapist_name: z.string(),
});

export const patientDetailSchema = patientListSchema.extend({
  referral: z.number().nullable(),
  phone: z.string(),
  consent_flags: z.record(z.unknown()),
  referral_timeline: referralTimelineSchema.nullable(),
  appointments_timeline: z.array(appointmentTimelineSchema),
});

// Appointment
export const appointmentListSchema = z.object({
  id: z.number(),
  patient: z.number(),
  patient_name: z.string(),
  therapist: z.number(),
  therapist_name: z.string(),
  starts_at: z.string(),
  ends_at: z.string(),
  status: z.string(),
  created_at: z.string(),
});

export const sessionNoteSchema = z.object({
  id: z.number(),
  author: z.number(),
  body: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const appointmentDetailSchema = appointmentListSchema.extend({
  updated_at: z.string(),
  session_note: sessionNoteSchema.nullable(),
});

// Audit
export const auditEventSchema = z.object({
  id: z.string(),
  actor: z.number().nullable(),
  action: z.string(),
  entity_type: z.string(),
  entity_id: z.string(),
  metadata: z.record(z.unknown()),
  ip: z.string(),
  user_agent: z.string(),
  created_at: z.string(),
});

export type LoginForm = z.infer<typeof loginSchema>;
export type Me = z.infer<typeof meSchema>;
export type TherapistList = z.infer<typeof therapistListSchema>;
export type TherapistDetail = z.infer<typeof therapistDetailSchema>;
export type ReferralList = z.infer<typeof referralListSchema>;
export type ReferralDetail = z.infer<typeof referralDetailSchema>;
export type ReferralNote = z.infer<typeof referralNoteSchema>;
export type Questionnaire = z.infer<typeof questionnaireSchema>;
export type Clinic = z.infer<typeof clinicSchema>;
export type PatientList = z.infer<typeof patientListSchema>;
export type PatientDetail = z.infer<typeof patientDetailSchema>;
export type AppointmentList = z.infer<typeof appointmentListSchema>;
export type AppointmentDetail = z.infer<typeof appointmentDetailSchema>;
export type AuditEvent = z.infer<typeof auditEventSchema>;
