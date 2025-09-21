"use client";

import { useEffect, useState, useCallback } from 'react';
import { auth } from '@/lib/firebase-client';
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut, getIdTokenResult, User } from 'firebase/auth';

export type AdminState = {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  claims: Record<string, unknown> | null;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
};

export function useAdmin(): AdminState {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [claims, setClaims] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
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
    };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
    // Claims are set server-side; the next onAuthStateChanged + getIdTokenResult will refresh state
  }, []);

  const logout = useCallback(async () => {
    await signOut(auth);
  }, []);

  return { user, loading, isAdmin, claims, signInWithGoogle, logout };
}
