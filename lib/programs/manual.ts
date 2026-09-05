/**
 * Courses a student has ticked off by hand: uploading a Ladok certificate is accurate but a
 * real barrier, so these marks live in the browser rather than in an account.
 */

const STORAGE_KEY = 'uuais.programs.completed.v1';

type Store = Record<string, string[]>;

function read(): Store {
  // Storage can be unavailable (private windows) or hold junk from an older version.
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return parsed as Store;
  } catch {
    return {};
  }
}

function write(store: Store): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Nothing to do: the marks simply will not survive a reload.
  }
}

export function loadManualPassed(programCode: string): Set<string> {
  const codes = read()[programCode];
  return new Set(Array.isArray(codes) ? codes.filter((c) => typeof c === 'string') : []);
}

export function saveManualPassed(programCode: string, passed: Set<string>): void {
  const store = read();
  if (passed.size === 0) delete store[programCode];
  else store[programCode] = [...passed].sort();
  write(store);
  notify();
}

// ---- Subscription, so components can read the marks without an effect ----

const listeners = new Set<() => void>();
/**
 * getSnapshot must return a stable reference or React re-renders forever, so the last value
 * is cached per programme.
 */
const snapshots = new Map<string, Set<string>>();

function notify(): void {
  snapshots.clear();
  for (const listener of listeners) listener();
}

export function subscribeManualPassed(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getManualPassedSnapshot(programCode: string): Set<string> {
  const cached = snapshots.get(programCode);
  if (cached) return cached;
  const value = loadManualPassed(programCode);
  snapshots.set(programCode, value);
  return value;
}

/** Nothing is marked while rendering on the server. */
const EMPTY: Set<string> = new Set();

export function getManualPassedServerSnapshot(): Set<string> {
  return EMPTY;
}
