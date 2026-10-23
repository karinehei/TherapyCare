/**
 * Session reference date for demo fixtures.
 * Dates are derived from this so appointments stay usable over time.
 * Tests can pin the clock with setDemoNow / setDemoReferenceDate.
 */

let referenceDate: Date | null = null;
let fixedNow: Date | null = null;

function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

/** Current demo clock (fixed in tests, otherwise wall clock). */
export function demoNow(): Date {
  return fixedNow ? new Date(fixedNow.getTime()) : new Date();
}

/** Anchor date for generating relative fixture timestamps. */
export function getDemoReferenceDate(): Date {
  if (!referenceDate) {
    referenceDate = startOfLocalDay(demoNow());
  }
  return new Date(referenceDate.getTime());
}

export function setDemoReferenceDate(date: Date | null): void {
  referenceDate = date ? startOfLocalDay(date) : null;
}

export function setDemoNow(date: Date | null): void {
  fixedNow = date ? new Date(date.getTime()) : null;
}

/** Reset clock state (e.g. between tests). */
export function resetDemoClock(): void {
  referenceDate = null;
  fixedNow = null;
}

/** ISO local datetime at reference + dayOffset, at the given HH:mm. */
export function demoDateTime(dayOffset: number, timeHHmm: string): string {
  const ref = getDemoReferenceDate();
  const [hh, mm] = timeHHmm.split(":").map((n) => parseInt(n, 10));
  const d = new Date(ref);
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hh || 0, mm || 0, 0, 0);
  return d.toISOString();
}

export function demoIsoNow(): string {
  return demoNow().toISOString();
}
