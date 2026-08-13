/** Chrome-only identity, persisted so a hard refresh paints the name immediately. */
export type CachedIdentity = {
  uid: string;
  name: string | null;
  email: string | null;
  photoURL: string | null;
  isAdmin: boolean;
};

export const CACHE_KEY = 'uuais.identity';

export const readCache = (): CachedIdentity | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as CachedIdentity) : null;
  } catch {
    return null;
  }
};

export const writeCache = (identity: CachedIdentity | null) => {
  if (typeof window === 'undefined') return;
  try {
    if (identity) window.localStorage.setItem(CACHE_KEY, JSON.stringify(identity));
    else window.localStorage.removeItem(CACHE_KEY);
  } catch {
    /* private mode / quota — the cache is an optimisation, not a requirement */
  }
};

/** Whether a session was persisted on this device; returning users get auth started immediately, anonymous visitors defer it until after LCP / first interaction. */
export const hasCachedIdentity = (): boolean => readCache() !== null;
