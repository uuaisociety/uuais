'use client';

import { useCallback, useSyncExternalStore } from 'react';
import type { User } from 'firebase/auth';
import { scheduleIdle } from '@/lib/idle';
import {
  readCache,
  writeCache,
  hasCachedIdentity,
  type CachedIdentity,
} from '@/lib/identity-cache';
import type { UserProfile } from '@/lib/firestore/users';
import { withTimeout } from '@/lib/with-timeout';

/** A single module-level auth subscription shared by every consumer (so readers get the resolved state synchronously); auth is lazy-loaded and registered once idle, keeping the iframe fetch out of the critical network chain (LCP). */

type Store = {
  user: User | null;
  loading: boolean;
  profileLoading: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  /** On the partner allowlist; partner accounts have no member profile. UI only, the server re-checks. */
  isPartner: boolean;
  claims: Record<string, unknown> | null;
  profile: UserProfile | null;
  /** The profile read failed or timed out (offline, Firestore down): the profile is unknown, not missing. Retried automatically. */
  profileError: boolean;
  /** Last known identity from localStorage. Display only — never a permission gate. */
  cached: CachedIdentity | null;
};

let store: Store = {
  user: null,
  loading: true,
  profileLoading: false,
  profileError: false,
  isAdmin: false,
  isSuperAdmin: false,
  isPartner: false,
  claims: null,
  profile: null,
  cached: null,
};

const serverStore: Store = { ...store };

const listeners = new Set<() => void>();

const setStore = (patch: Partial<Store>) => {
  store = { ...store, ...patch };
  listeners.forEach((l) => l());
};

/** Successful profile lookups are memoised per uid so navigation never refetches; failures are not, so they're retried. */
const profileRequests = new Map<string, Promise<UserProfile | null>>();

// A hung Firestore read would otherwise leave every profile-dependent page loading forever.
const PROFILE_TIMEOUT_MS = 15_000;

/** Resolves null only when the profile document doesn't exist; rejects when the read fails. */
const loadProfile = (uid: string): Promise<UserProfile | null> => {
  let request = profileRequests.get(uid);
  if (!request) {
    const attempt = withTimeout(
      import('@/lib/firestore/users').then(({ getUserProfile }) =>
        getUserProfile(uid),
      ),
      PROFILE_TIMEOUT_MS,
    );
    attempt.catch(() => {
      if (profileRequests.get(uid) === attempt) profileRequests.delete(uid);
    });
    profileRequests.set(uid, attempt);
    request = attempt;
  }
  return request;
};

// Retry a failed profile read with backoff (capped low: a server-side outage
// never fires the browser's `online` event), and as soon as the browser is back online.
const RETRY_DELAYS_MS = [2_000, 4_000, 8_000, 10_000];
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let retryAttempt = 0;

const clearProfileRetry = () => {
  if (retryTimer) clearTimeout(retryTimer);
  retryTimer = null;
  retryAttempt = 0;
};

const scheduleProfileRetry = () => {
  if (retryTimer) return;
  const delay =
    RETRY_DELAYS_MS[Math.min(retryAttempt, RETRY_DELAYS_MS.length - 1)];
  retryAttempt += 1;
  retryTimer = setTimeout(() => {
    retryTimer = null;
    void refreshProfile();
  }, delay);
};

// Only a verified email can match the allowlist; rules enforce the same.
const loadIsPartner = (u: User): Promise<boolean> =>
  u.email && u.emailVerified
    ? import('@/lib/firestore/partners')
        .then(({ isPartnerEmail }) => isPartnerEmail(u.email as string))
        .catch(() => false)
    : Promise.resolve(false);

/** Re-read the signed-in user's profile and publish it to the store so dependent UI sees fresh data after a save. Never throws: a failed read is retried, and sets `profileError` only when no profile was ever loaded (a known profile stays shown). */
export const refreshProfile = async (): Promise<void> => {
  const uid = store.user?.uid;
  if (!uid) return;
  profileRequests.delete(uid);
  let profile: UserProfile | null;
  try {
    profile = await loadProfile(uid);
  } catch (e) {
    console.warn('Profile read failed; retrying', e);
    if (store.user?.uid !== uid) return;
    // An earlier error stays an error; a profile that already loaded stays shown.
    scheduleProfileRetry();
    return;
  }
  if (store.user?.uid !== uid) return;
  clearProfileRetry();
  publish(profile);
};

const publish = (profile: UserProfile | null) => {
  const cached = store.cached
    ? {
        ...store.cached,
        name: profile?.displayName || profile?.name || store.cached.name,
      }
    : null;
  if (cached) writeCache(cached);
  setStore({ profile, profileLoading: false, profileError: false, cached });
};

/** Publish a profile the caller just wrote, so the header, gate and pages see it without waiting for a read. */
export const publishProfile = (profile: UserProfile): void => {
  if (store.user?.uid !== profile.id) return;
  publish(profile);
};

let started = false;
let authInitialized = false;

const initializeAuth = () => {
  if (authInitialized || typeof window === 'undefined') return;
  authInitialized = true;

  void Promise.all([
    import('firebase/auth'),
    import('@/lib/firebase-client'),
  ]).then(([{ onAuthStateChanged, getIdTokenResult }, { auth }]) => {
    // Guard the async callback so a stale auth event can't clobber newer state (auth fires repeatedly on mobile).
    let authGeneration = 0;
    onAuthStateChanged(auth, async (u) => {
      const gen = ++authGeneration;

      if (!u) {
        profileRequests.clear();
        clearProfileRetry();
        writeCache(null);
        if (gen !== authGeneration) return;
        setStore({
          user: null,
          loading: false,
          profileLoading: false,
          profileError: false,
          isAdmin: false,
          isSuperAdmin: false,
          isPartner: false,
          claims: null,
          profile: null,
          cached: null,
        });
        return;
      }

      // Read cached claims without forcing a network refresh; a stale admin claim only affects chrome, the proxy and Firestore rules re-check server side.
      let tokenClaims: Record<string, unknown> = {};
      try {
        const tokenRes = await getIdTokenResult(u);
        tokenClaims = (tokenRes.claims || {}) as Record<string, unknown>;
      } catch (e) {
        console.error('Failed to get ID token claims', e);
      }

      const isAdmin = Boolean(tokenClaims.admin);
      const isSuperAdmin = Boolean(tokenClaims.superAdmin);

      if (gen !== authGeneration) return;

      setStore({
        user: u,
        loading: false,
        profileLoading: true,
        profileError: false,
        isAdmin,
        isSuperAdmin,
        claims: tokenClaims,
        cached: {
          uid: u.uid,
          // Keep the last profile name for this user until the profile loads, so it doesn't flip to the auth name and back.
          name:
            (store.cached?.uid === u.uid && store.cached.name) || u.displayName,
          email: u.email,
          photoURL: u.photoURL,
          isAdmin,
        },
      });

      const [profileResult, isPartner] = await Promise.all([
        loadProfile(u.uid).then(
          (profile) => ({ ok: true as const, profile }),
          (error: unknown) => ({ ok: false as const, error }),
        ),
        loadIsPartner(u),
      ]);
      if (gen !== authGeneration) return;

      if (!profileResult.ok) {
        // Unknown, not missing: keep the user signed in and retry, never treat them as unregistered.
        console.warn('Profile read failed; retrying', profileResult.error);
        setStore({ isPartner, profileLoading: false, profileError: true });
        scheduleProfileRetry();
        return;
      }

      clearProfileRetry();
      const { profile } = profileResult;
      const name =
        profile?.displayName || profile?.name || u.displayName || null;
      const identity: CachedIdentity = {
        uid: u.uid,
        name,
        email: u.email,
        photoURL: u.photoURL,
        isAdmin,
      };
      writeCache(identity);
      setStore({
        profile,
        isPartner,
        profileLoading: false,
        profileError: false,
        cached: identity,
      });
    });

    window.addEventListener('online', () => {
      if (store.profileError) {
        clearProfileRetry();
        void refreshProfile();
      }
    });
  });
};

const start = (eager = false) => {
  if (typeof window === 'undefined') return;
  if (!started) {
    started = true;
    setStore({ cached: readCache() });

    // Returning visitors (cached identity) start auth immediately; anonymous visitors defer the auth SDK until after LCP / first interaction.
    if (!eager) scheduleIdle(initializeAuth, hasCachedIdentity() ? 0 : 3500);
  }
  if (eager) initializeAuth();
};

/** Start the auth subscription now instead of after the idle delay, e.g. right after a sign-in so the shared store sees the new user. */
export const ensureAuth = (): void => start(true);

const subscribe = (listener: () => void) => {
  start();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const subscribeEager = (listener: () => void) => {
  start(true);
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const getSnapshot = () => store;
const getServerSnapshot = () => serverStore;

export type AdminState = {
  user: User | null;
  loading: boolean;
  profileLoading: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isPartner: boolean;
  claims: Record<string, unknown> | null;
  profile: UserProfile | null;
  profileError: boolean;
  cached: CachedIdentity | null;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
};

export function useAdmin(options?: { eager?: boolean }): AdminState {
  const snapshot = useSyncExternalStore(
    options?.eager ? subscribeEager : subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  const signInWithGoogle = useCallback(async () => {
    const [
      { GoogleAuthProvider, signInWithPopup },
      { auth, refreshSessionCookie },
    ] = await Promise.all([
      import('firebase/auth'),
      import('@/lib/firebase-client'),
    ]);
    const provider = new GoogleAuthProvider();
    // Wait for the persisted-user lookup so a slow init can't clear this sign-in.
    await auth.authStateReady();
    await signInWithPopup(auth, provider);
    // Mint the httpOnly cookie so server APIs authenticate as this user (logout clears it, so re-login re-mints).
    await refreshSessionCookie();
  }, []);

  const logout = useCallback(async () => {
    const { signOut } = await import('firebase/auth');
    const { auth } = await import('@/lib/firebase-client');
    await signOut(auth);
    try {
      // Clear the httpOnly AuthToken cookie via the proxy (logoutPath handler), or server APIs keep accepting it for 12h.
      await fetch('/api/logout', { method: 'POST' });
    } catch (e) {
      console.error('Failed to clear auth cookie', e);
    }
  }, []);

  return { ...snapshot, signInWithGoogle, logout };
}
