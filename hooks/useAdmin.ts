"use client";

import { useCallback, useSyncExternalStore } from 'react';
import { auth, refreshSessionCookie } from '@/lib/firebase-client';
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut, getIdTokenResult, User } from 'firebase/auth';
import { getUserProfile, type UserProfile } from '@/lib/firestore/users';

/**
 * A single auth subscription shared by every consumer.
 *
 * Previously each `useAdmin()` call opened its own `onAuthStateChanged`
 * listener and started at `loading: true`, then force-refreshed the ID token
 * over the network. Any component that mounted — including the header on every
 * navigation — replayed that round trip, so the signed-in name blanked out and
 * popped back. With a module-level store the second and later readers get the
 * resolved state synchronously.
 */

/** Chrome-only identity, persisted so a hard refresh paints the name immediately. */
export type CachedIdentity = {
  uid: string;
  name: string | null;
  email: string | null;
  photoURL: string | null;
  isAdmin: boolean;
};

type Store = {
  user: User | null;
  loading: boolean;
  profileLoading: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  claims: Record<string, unknown> | null;
  profile: UserProfile | null;
  /** Last known identity from localStorage. Display only — never a permission gate. */
  cached: CachedIdentity | null;
};

const CACHE_KEY = 'uuais.identity';

const readCache = (): CachedIdentity | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as CachedIdentity) : null;
  } catch {
    return null;
  }
};

const writeCache = (identity: CachedIdentity | null) => {
  if (typeof window === 'undefined') return;
  try {
    if (identity) window.localStorage.setItem(CACHE_KEY, JSON.stringify(identity));
    else window.localStorage.removeItem(CACHE_KEY);
  } catch {
    /* private mode / quota — the cache is an optimisation, not a requirement */
  }
};

let store: Store = {
  user: null,
  loading: true,
  profileLoading: false,
  isAdmin: false,
  isSuperAdmin: false,
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

/** Profile lookups are memoised per uid so navigation never refetches. */
const profileRequests = new Map<string, Promise<UserProfile | null>>();

const loadProfile = (uid: string): Promise<UserProfile | null> => {
  let request = profileRequests.get(uid);
  if (!request) {
    request = getUserProfile(uid).catch(() => null);
    profileRequests.set(uid, request);
  }
  return request;
};

let started = false;

const start = () => {
  if (started || typeof window === 'undefined') return;
  started = true;

  setStore({ cached: readCache() });

  onAuthStateChanged(auth, async (u) => {
    if (!u) {
      profileRequests.clear();
      writeCache(null);
      setStore({ user: null, loading: false, profileLoading: false, isAdmin: false, isSuperAdmin: false, claims: null, profile: null, cached: null });
      return;
    }

    // The cached token already carries custom claims, so read it without
    // forcing a refresh. A stale admin claim only affects which chrome renders;
    // the proxy and Firestore rules re-check server side on every request.
    let tokenClaims: Record<string, unknown> = {};
    try {
      const tokenRes = await getIdTokenResult(u);
      tokenClaims = (tokenRes.claims || {}) as Record<string, unknown>;
    } catch (e) {
      console.error('Failed to get ID token claims', e);
    }

    const isAdmin = Boolean(tokenClaims.admin);
    const isSuperAdmin = Boolean(tokenClaims.superAdmin);

    setStore({
      user: u,
      loading: false,
      profileLoading: true,
      isAdmin,
      isSuperAdmin,
      claims: tokenClaims,
      cached: { uid: u.uid, name: u.displayName, email: u.email, photoURL: u.photoURL, isAdmin },
    });

    const profile = await loadProfile(u.uid);
    if (auth.currentUser?.uid !== u.uid) return;

    const name = profile?.displayName || profile?.name || u.displayName || null;
    const identity: CachedIdentity = { uid: u.uid, name, email: u.email, photoURL: u.photoURL, isAdmin };
    writeCache(identity);
    setStore({ profile, profileLoading: false, cached: identity });
  });
};

const subscribe = (listener: () => void) => {
  start();
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
  claims: Record<string, unknown> | null;
  profile: UserProfile | null;
  cached: CachedIdentity | null;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
};

export function useAdmin(): AdminState {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const signInWithGoogle = useCallback(async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
    // Mint the httpOnly cookie so server APIs authenticate as this user (logout clears it, so re-login re-mints).
    await refreshSessionCookie();
  }, []);

  const logout = useCallback(async () => {
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
