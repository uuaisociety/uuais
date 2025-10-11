/**
 * Recursively remove undefined values from objects/arrays before persisting to Firestore.
 */
export function stripUndefined<T>(value: T): T {
  if (value === undefined || value === null) {
    return value;
  }

  if (Array.isArray(value)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const arr = (value as any[])
      .map((v) => stripUndefined(v))
      .filter((v) => v !== undefined);
    return arr as unknown as T;
  }

  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    Object.keys(obj).forEach((key) => {
      const v = stripUndefined(obj[key]);
      if (v !== undefined) {
        out[key] = v as unknown;
      }
    });
    return out as unknown as T;
  }

  return value;
}

export function ensureString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

export function ensureTimestampIso(ts: unknown): string {
  if (!ts) return '';
  if (typeof ts === 'string') return ts;
  if (typeof (ts as { toDate?: () => Date }).toDate === 'function') {
    return (ts as { toDate: () => Date }).toDate().toISOString();
  }
  if (ts instanceof Date) return ts.toISOString();
  return '';
}
