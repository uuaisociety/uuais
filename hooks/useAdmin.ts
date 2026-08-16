"use client";

import { useCallback, useSyncExternalStore } from 'react';
import type { User } from 'firebase/auth';
import { scheduleIdle } from '@/lib/idle';
import { readCache, writeCache, hasCachedIdentity, type CachedIdentity } from '@/lib/identity-cache';
import type { UserProfile } from '@/lib/firestore/users';

/** A single module-level auth subscription shared by every consumer (so readers get the resolved state synchronously); auth is lazy-loaded and registered once idle, keeping the iframe fetch out of the critical network chain (LCP). */

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
    request = import('@/lib/firestore/users').then(({ getUserProfile }) => getUserProfile(uid)).catch(() => null);
    profileRequests.set(uid, request);
  }
  return request;
};

/** Re-read the signed-in user's profile and publish it to the store so dependent UI sees fresh data after a save. */
export const refreshProfile = async (): Promise<void> => {
  const uid = store.user?.uid;
  if (!uid) return;
  profileRequests.delete(uid);
  const profile = await loadProfile(uid);
  if (store.user?.uid !== uid) return;
  const cached = store.cached
    ? { ...store.cached, name: profile?.displayName || profile?.name || store.cached.name }
    : null;
  setStore({ profile, profileLoading: false, cached });
};

let started = false;

const start = () => {
  if (started || typeof window === 'undefined') return;
  started = true;

  setStore({ cached: readCache() });

  // Returning visitors (cached identity) start auth immediately; anonymous visitors defer the auth SDK until after LCP / first interaction.
  scheduleIdle(
    () => {
      void Promise.all([import('firebase/auth'), import('@/lib/firebase-client')]).then(
        ([{ onAuthStateChanged, getIdTokenResult }, { auth }]) => {
          // Guard the async callback so a stale auth event can't clobber newer state (auth fires repeatedly on mobile).
          let authGeneration = 0;
          onAuthStateChanged(auth, async (u) => {
            const gen = ++authGeneration;

            if (!u) {
              profileRequests.clear();
              writeCache(null);
              if (gen !== authGeneration) return;
              setStore({ user: null, loading: false, profileLoading: false, isAdmin: false, isSuperAdmin: false, claims: null, profile: null, cached: null });
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
              isAdmin,
              isSuperAdmin,
              claims: tokenClaims,
              cached: { uid: u.uid, name: u.displayName, email: u.email, photoURL: u.photoURL, isAdmin },
            });

            const profile = await loadProfile(u.uid);
            if (gen !== authGeneration) return;

            const name = profile?.displayName || profile?.name || u.displayName || null;
            const identity: CachedIdentity = { uid: u.uid, name, email: u.email, photoURL: u.photoURL, isAdmin };
            writeCache(identity);
            setStore({ profile, profileLoading: false, cached: identity });
          });
        }
      );
    },
    hasCachedIdentity() ? 0 : 3500
  );
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
    const [{ GoogleAuthProvider, signInWithPopup }, { auth, refreshSessionCookie }] = await Promise.all([
      import('firebase/auth'),
      import('@/lib/firebase-client'),
    ]);
    const provider = new GoogleAuthProvider();
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
