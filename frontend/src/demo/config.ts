/**
 * Demo mode is enabled only when VITE_DEMO_MODE is exactly "true" at build time.
 * Never treat API failures as a reason to enter demo mode.
 */
export const isDemoMode: boolean = import.meta.env.VITE_DEMO_MODE === "true";

export const DEMO_STORAGE_KEY = "therapycare:pages-demo:v1";

export const DEMO_SOURCE_URL = "https://github.com/karinehei/TherapyCare";

export const DEMO_PAGES_URL = "https://karinehei.github.io/TherapyCare/";

export type DemoRole = "help_seeker" | "clinic_admin";

export const DEMO_ROLES: {
  role: DemoRole;
  label: string;
  description: string;
}[] = [
  {
    role: "help_seeker",
    label: "Help seeker (client)",
    description:
      "Search therapists, submit a referral, and view your fictional appointments.",
  },
  {
    role: "clinic_admin",
    label: "Clinic admin (staff)",
    description:
      "Browse patients, manage referrals and status transitions, book or cancel appointments, and view the audit log.",
  },
];
