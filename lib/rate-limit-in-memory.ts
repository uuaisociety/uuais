interface WindowState {
  count: number;
  resetAt: number;
}

const windows = new Map<string, WindowState>();

export interface RateWindowResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export function checkWindow(key: string, limit: number, windowMs: number): RateWindowResult {
  const now = Date.now();
  let state = windows.get(key);
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
  windows.clear();
}
