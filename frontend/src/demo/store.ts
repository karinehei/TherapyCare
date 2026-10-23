import type { DemoRole } from "./config";
import { DEMO_STORAGE_KEY } from "./config";
import { createInitialFixtures, type DemoFixtures } from "./fixtures";
import { resetDemoClock, setDemoReferenceDate } from "./clock";

export interface DemoPersistedState extends DemoFixtures {
  version: 1;
  role: DemoRole | null;
  referenceDateIso: string;
}

type Listener = () => void;

let memoryState: DemoPersistedState | null = null;
let storageAvailable: boolean | null = null;
const listeners = new Set<Listener>();

function canUseSessionStorage(): boolean {
  if (storageAvailable !== null) return storageAvailable;
  try {
    const k = "__therapycare_demo_probe__";
    sessionStorage.setItem(k, "1");
    sessionStorage.removeItem(k);
    storageAvailable = true;
  } catch {
    storageAvailable = false;
  }
  return storageAvailable;
}

function isValidState(raw: unknown): raw is DemoPersistedState {
  if (!raw || typeof raw !== "object") return false;
  const s = raw as Record<string, unknown>;
  if (s.version !== 1) return false;
  if (
    s.role !== null &&
    s.role !== "help_seeker" &&
    s.role !== "clinic_admin"
  ) {
    return false;
  }
  if (!Array.isArray(s.therapists) || !Array.isArray(s.patients)) return false;
  if (!Array.isArray(s.referrals) || !Array.isArray(s.appointments))
    return false;
  if (!Array.isArray(s.clinics) || !Array.isArray(s.auditEvents)) return false;
  if (!s.nextIds || typeof s.nextIds !== "object") return false;
  if (typeof s.referenceDateIso !== "string") return false;
  return true;
}

function buildFreshState(role: DemoRole | null = null): DemoPersistedState {
  resetDemoClock();
  const fixtures = createInitialFixtures();
  return {
    version: 1,
    role,
    referenceDateIso: new Date().toISOString(),
    ...fixtures,
  };
}

function readFromStorage(): DemoPersistedState | null {
  if (!canUseSessionStorage()) return null;
  try {
    const raw = sessionStorage.getItem(DEMO_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isValidState(parsed)) {
      sessionStorage.removeItem(DEMO_STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    try {
      sessionStorage.removeItem(DEMO_STORAGE_KEY);
    } catch {
      /* ignore */
    }
    return null;
  }
}

function writeToStorage(state: DemoPersistedState): void {
  if (!canUseSessionStorage()) return;
  try {
    sessionStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* quota / private mode — keep in-memory only */
  }
}

export function getDemoState(): DemoPersistedState {
  if (memoryState) return memoryState;
  const stored = readFromStorage();
  if (stored) {
    memoryState = stored;
    try {
      setDemoReferenceDate(new Date(stored.referenceDateIso));
    } catch {
      /* ignore bad date */
    }
    return memoryState;
  }
  memoryState = buildFreshState(null);
  writeToStorage(memoryState);
  return memoryState;
}

export function setDemoState(
  updater: (prev: DemoPersistedState) => DemoPersistedState
): DemoPersistedState {
  const next = updater(getDemoState());
  memoryState = next;
  writeToStorage(next);
  listeners.forEach((l) => l());
  return next;
}

export function subscribeDemoStore(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getDemoRole(): DemoRole | null {
  return getDemoState().role;
}

export function setDemoRole(role: DemoRole | null): void {
  setDemoState((prev) => ({ ...prev, role }));
}

/** Restore original fixtures, clear only this demo's storage key, keep no role. */
export function resetDemoState(): DemoPersistedState {
  if (canUseSessionStorage()) {
    try {
      sessionStorage.removeItem(DEMO_STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }
  memoryState = buildFreshState(null);
  writeToStorage(memoryState);
  listeners.forEach((l) => l());
  return memoryState;
}

/** Test helper: replace in-memory state without touching unrelated storage. */
export function __replaceDemoStateForTests(
  state: DemoPersistedState | null
): void {
  memoryState = state;
  storageAvailable = null;
}

export function isDemoStorageAvailable(): boolean {
  return canUseSessionStorage();
}
