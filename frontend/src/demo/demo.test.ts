import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/api/errors";
import { apiRequest } from "@/api/client";
import { getAllowedTransitions } from "./transitions";
import { demoRequest } from "./handlers";
import {
  __replaceDemoStateForTests,
  getDemoRole,
  getDemoState,
  resetDemoState,
  setDemoRole,
} from "./store";
import { setDemoNow, setDemoReferenceDate, resetDemoClock } from "./clock";
import { DEMO_STORAGE_KEY, isDemoMode } from "./config";
import { HELP_SEEKER_PATIENT_ID } from "./fixtures";

describe("demo transitions", () => {
  it("exposes the same allowed transitions as the backend state machine", () => {
    expect(getAllowedTransitions("new")).toEqual([
      "needs_info",
      "approved",
      "rejected",
    ]);
    expect(getAllowedTransitions("closed")).toEqual([]);
    expect(getAllowedTransitions("rejected")).toEqual([]);
  });
});

describe("demo store restore and reset", () => {
  beforeEach(() => {
    resetDemoClock();
    setDemoNow(new Date("2026-10-20T12:00:00.000Z"));
    setDemoReferenceDate(new Date("2026-10-20T12:00:00.000Z"));
    sessionStorage.removeItem(DEMO_STORAGE_KEY);
    __replaceDemoStateForTests(null);
    resetDemoState();
  });

  afterEach(() => {
    sessionStorage.removeItem(DEMO_STORAGE_KEY);
    __replaceDemoStateForTests(null);
    resetDemoClock();
  });

  it("persists and restores role + data under the versioned key", () => {
    setDemoRole("clinic_admin");
    const before = getDemoState();
    expect(before.role).toBe("clinic_admin");
    expect(before.therapists.length).toBeGreaterThan(0);

    __replaceDemoStateForTests(null);
    const restored = getDemoState();
    expect(restored.role).toBe("clinic_admin");
    expect(restored.therapists.length).toBe(before.therapists.length);
    expect(sessionStorage.getItem(DEMO_STORAGE_KEY)).toBeTruthy();
  });

  it("recovers from corrupt storage", () => {
    sessionStorage.setItem(DEMO_STORAGE_KEY, "{not-json");
    __replaceDemoStateForTests(null);
    const state = getDemoState();
    expect(state.version).toBe(1);
    expect(state.role).toBeNull();
  });

  it("reset clears only the demo key and restores fixtures", async () => {
    sessionStorage.setItem("other-app:data", "keep-me");
    setDemoRole("help_seeker");
    await demoRequest("/demo/book", {
      method: "POST",
      body: JSON.stringify({
        therapist: 1,
        starts_at: "2026-10-21T09:00:00.000Z",
        ends_at: "2026-10-21T10:00:00.000Z",
      }),
    });
    const countBefore = getDemoState().appointments.length;
    expect(countBefore).toBeGreaterThan(2);

    resetDemoState();
    expect(getDemoRole()).toBeNull();
    expect(getDemoState().appointments.length).toBe(2);
    expect(sessionStorage.getItem("other-app:data")).toBe("keep-me");
  });
});

describe("demo booking and referrals", () => {
  beforeEach(() => {
    resetDemoClock();
    setDemoNow(new Date("2026-10-20T12:00:00.000Z"));
    setDemoReferenceDate(new Date("2026-10-20T12:00:00.000Z"));
    sessionStorage.removeItem(DEMO_STORAGE_KEY);
    __replaceDemoStateForTests(null);
    resetDemoState();
    setDemoRole("clinic_admin");
  });

  afterEach(() => {
    sessionStorage.removeItem(DEMO_STORAGE_KEY);
    __replaceDemoStateForTests(null);
    resetDemoClock();
  });

  it("books and cancels consistently", async () => {
    const starts_at = "2026-10-24T15:00:00.000Z";
    const ends_at = "2026-10-24T16:00:00.000Z";
    const created = await demoRequest<{ id: number; status: string }>(
      "/appointments/",
      {
        method: "POST",
        body: JSON.stringify({
          patient: 2,
          therapist: 1,
          starts_at,
          ends_at,
        }),
      }
    );
    expect(created.status).toBe("booked");

    await expect(
      demoRequest("/appointments/", {
        method: "POST",
        body: JSON.stringify({
          patient: 1,
          therapist: 1,
          starts_at,
          ends_at,
        }),
      })
    ).rejects.toBeInstanceOf(ApiError);

    const cancelled = await demoRequest<{ status: string }>(
      `/appointments/${created.id}/`,
      {
        method: "PATCH",
        body: JSON.stringify({ status: "cancelled" }),
      }
    );
    expect(cancelled.status).toBe("cancelled");

    const again = await demoRequest<{ id: number }>("/appointments/", {
      method: "POST",
      body: JSON.stringify({
        patient: 2,
        therapist: 1,
        starts_at,
        ends_at,
      }),
    });
    expect(again.id).not.toBe(created.id);
  });

  it("creates referrals and enforces valid/invalid status transitions", async () => {
    const created = await demoRequest<{ id: number }>("/referrals/", {
      method: "POST",
      body: JSON.stringify({
        patient_name: "Casey Demo",
        patient_email: "casey.demo@example.invalid",
        reason: "Fictional demo referral",
        clinic: 1,
      }),
    });

    const detail = await demoRequest<{
      status: string;
      allowed_transitions: string[];
    }>(`/referrals/${created.id}/`);
    expect(detail.status).toBe("new");
    expect(detail.allowed_transitions).toContain("approved");

    await demoRequest(`/referrals/${created.id}/`, {
      method: "PATCH",
      body: JSON.stringify({ status: "approved" }),
    });

    await expect(
      demoRequest(`/referrals/${created.id}/`, {
        method: "PATCH",
        body: JSON.stringify({ status: "new" }),
      })
    ).rejects.toMatchObject({ status: 400 });

    const after = await demoRequest<{ status: string }>(
      `/referrals/${created.id}/`
    );
    expect(after.status).toBe("approved");
  });

  it("isolates help_seeker data from clinic_admin view after role switch", async () => {
    const adminPatients = await demoRequest<{ results: { id: number }[] }>(
      "/patients/"
    );
    expect(adminPatients.results.length).toBeGreaterThan(1);

    setDemoRole("help_seeker");
    const seekerPatients = await demoRequest<{ results: { id: number }[] }>(
      "/patients/"
    );
    expect(seekerPatients.results).toHaveLength(1);
    expect(seekerPatients.results[0].id).toBe(HELP_SEEKER_PATIENT_ID);
  });
});

describe("normal mode uses real implementation path", () => {
  it("keeps isDemoMode false unless VITE_DEMO_MODE is exactly true", () => {
    expect(isDemoMode).toBe(false);
  });

  it("routes apiRequest through fetch when demo mode is off", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    await apiRequest("/therapists/");
    expect(fetchSpy).toHaveBeenCalled();
    const url = String(fetchSpy.mock.calls[0]?.[0] ?? "");
    expect(url).toContain("/api/v1/therapists");
    fetchSpy.mockRestore();
  });
});
