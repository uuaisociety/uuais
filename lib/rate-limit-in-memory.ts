interface WindowState {
  count: number;
  resetAt: number;
}

// One store per bucket, so an unauthenticated endpoint filling its store (e.g.
// with rotating IPs) only fails closed for itself, not for every other limiter.
const buckets = new Map<string, Map<string, WindowState>>();
const MAX_WINDOWS = 10_000;
const SWEEP_INTERVAL_MS = 60_000;
let nextSweepAt = 0;

export interface RateWindowResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export function checkWindow(
  key: string,
  limit: number,
  windowMs: number,
  bucket = 'default',
): RateWindowResult {
  const now = Date.now();
  if (now >= nextSweepAt) {
    for (const store of buckets.values()) {
      for (const [existingKey, window] of store) {
        if (now >= window.resetAt) store.delete(existingKey);
      }
    }
    nextSweepAt = now + SWEEP_INTERVAL_MS;
  }
  let windows = buckets.get(bucket);
  if (!windows) {
    windows = new Map();
    buckets.set(bucket, windows);
  }
  let state = windows.get(key);
  if (!state && windows.size >= MAX_WINDOWS) {
    return { allowed: false, remaining: 0, resetAt: nextSweepAt };
  }
  if (!state || now >= state.resetAt) {
    state = { count: 0, resetAt: now + windowMs };
    windows.set(key, state);
  }
  state.count += 1;
  return {
    allowed: state.count <= limit,
    remaining: Math.max(0, limit - state.count),
    resetAt: state.resetAt,
  };
}

export function resetRateLimits(): void {
  buckets.clear();
  nextSweepAt = 0;
}
