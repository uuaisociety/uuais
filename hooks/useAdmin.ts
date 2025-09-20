"use client";

import { useEffect, useState, useCallback } from 'react';
import { auth } from '@/lib/firebase';
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut, getIdTokenResult, User } from 'firebase/auth';

export type AdminState = {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  claims: Record<string, unknown> | null;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  // Dev override controls
  enableDev: boolean;
  devActive: boolean;
  tryDevElevate: (password: string) => boolean;
  clearDevAdmin: () => void;
};

export function useAdmin(): AdminState {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [claims, setClaims] = useState<Record<string, unknown> | null>(null);
  const enableDev = typeof window !== 'undefined' && process.env.NEXT_PUBLIC_ENABLE_DEV_ADMIN === 'true';
  const [devActive, setDevActive] = useState<boolean>(false);

  useEffect(() => {
    // Initialize dev override state from localStorage
    if (typeof window !== 'undefined' && enableDev) {
      setDevActive(localStorage.getItem('devAdmin') === '1');
    }

    // Keep dev override in sync across all hook instances and tabs
    function syncFromStorage() {
      if (!enableDev || typeof window === 'undefined') return;
      const activeNow = localStorage.getItem('devAdmin') === '1';
      setDevActive(activeNow);
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', syncFromStorage);
      window.addEventListener('dev-admin-changed', syncFromStorage as EventListener);
    }

    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        try {
          const tokenRes = await getIdTokenResult(u, true);
          const tokenClaims = (tokenRes.claims || {}) as Record<string, unknown>;
          setClaims(tokenClaims);
          setIsAdmin(Boolean(tokenClaims.admin));
        } catch (e) {
          console.error('Failed to get ID token claims', e);
          setIsAdmin(false);
          setClaims(null);
        }
      } else {
        setIsAdmin(false);
        setClaims(null);
      }
      setLoading(false);
    });
    return () => {
      unsub();
      if (typeof window !== 'undefined') {
        window.removeEventListener('storage', syncFromStorage);
        window.removeEventListener('dev-admin-changed', syncFromStorage as EventListener);
      }
    };
  }, [enableDev]);

  const signInWithGoogle = useCallback(async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
    // Claims are set server-side; the next onAuthStateChanged + getIdTokenResult will refresh state
  }, []);

  const logout = useCallback(async () => {
    // Clear dev override first to ensure gating re-evaluates immediately
    if (typeof window !== 'undefined') localStorage.removeItem('devAdmin');
    setDevActive(false);
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('dev-admin-changed'));
    await signOut(auth);
    // No hard redirect needed; onAuthStateChanged will update state and AdminGate will re-render
  }, []);

  // Dev admin elevation and clearing
  const tryDevElevate = useCallback((password: string) => {
    if (!enableDev) return false;
    const expected = process.env.NEXT_PUBLIC_DEV_ADMIN_PASSWORD || '';
    const ok = password === expected && expected.length > 0;
    if (ok) {
      setDevActive(true);
      if (typeof window !== 'undefined') {
        localStorage.setItem('devAdmin', '1');
        window.dispatchEvent(new Event('dev-admin-changed'));
      }
    }
    return ok;
  }, [enableDev]);

  const clearDevAdmin = useCallback(() => {
    setDevActive(false);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('devAdmin');
      window.dispatchEvent(new Event('dev-admin-changed'));
    }
  }, []);

  // Merge real admin with dev override
  const effectiveIsAdmin = isAdmin || (enableDev && devActive);

  return { user, loading, isAdmin: effectiveIsAdmin, claims, signInWithGoogle, logout, enableDev, devActive, tryDevElevate, clearDevAdmin };
}
