/** Mirrors backend/referrals/state_machine.py */

export const REFERRAL_TRANSITIONS: Record<string, string[]> = {
  new: ["needs_info", "approved", "rejected"],
  needs_info: ["new", "approved", "rejected"],
  approved: ["scheduled", "rejected"],
  scheduled: ["ongoing", "closed"],
  ongoing: ["closed"],
  closed: [],
  rejected: [],
};

export function canTransition(fromStatus: string, toStatus: string): boolean {
  if (fromStatus === toStatus) return true;
  const allowed = REFERRAL_TRANSITIONS[fromStatus] ?? [];
  return allowed.includes(toStatus);
}

export function getAllowedTransitions(fromStatus: string): string[] {
  return [...(REFERRAL_TRANSITIONS[fromStatus] ?? [])];
}
