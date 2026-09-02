"use client";

import { useEffect, useRef } from 'react';
import { useAdmin } from '@/hooks/useAdmin';
import {
  getManualPassedSnapshot,
  saveManualPassed,
  subscribeManualPassed,
} from '@/lib/programs/manual';

/** Long enough to collapse a run of ticks into one write, short enough to survive a close. */
const FLUSH_DELAY_MS = 1500;

const serialise = (passed: Set<string>) => [...passed].sort().join(',');

/**
 * Mirrors the browser's marks into the student's account: localStorage stays the store the UI
 * reads, and on sign-in the account wins, except the first, where local marks are carried up.
 */
export function useProgramProgressSync(programCode: string): void {
  const { user, loading } = useAdmin();
  const uid = user?.uid ?? null;
  /** What the account is known to hold, so an unchanged set never costs a write. */
  const written = useRef<string | null>(null);
  const hydratedFor = useRef<string | null>(null);

  useEffect(() => {
    if (loading || !uid) {
      written.current = null;
      hydratedFor.current = null;
      return;
    }
    const key = `${uid}:${programCode}`;
    if (hydratedFor.current === key) return;
    hydratedFor.current = key;

    let cancelled = false;
    void (async () => {
      // Loaded on demand: most readers are signed out and should not pay for the Firestore SDK.
      const store = await import('@/lib/firestore/program-progress');
      try {
        const remote = await store.fetchProgramProgress(uid);
        if (cancelled) return;
        if (remote) {
          const codes = remote[programCode] ?? [];
          written.current = [...codes].sort().join(',');
          saveManualPassed(programCode, new Set(codes));
        } else {
          // No document yet: on first sign-in the browser's marks become the starting point.
          const local = getManualPassedSnapshot(programCode);
          written.current = serialise(local);
          if (local.size > 0) await store.writeProgramPassed(uid, programCode, [...local]);
        }
      } catch {
        // Offline or rules-denied: the map still works, the marks just stay local.
        hydratedFor.current = null;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [uid, loading, programCode]);

  useEffect(() => {
    if (!uid) return;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const flush = () => {
      timer = null;
      const next = serialise(getManualPassedSnapshot(programCode));
      if (written.current === null || next === written.current) return;
      written.current = next;
      void import('@/lib/firestore/program-progress')
        .then((store) =>
          store.writeProgramPassed(uid, programCode, next ? next.split(',') : [])
        )
        .catch(() => {
          // Let the next change try again rather than silently diverging.
          written.current = null;
        });
    };

    const unsubscribe = subscribeManualPassed(() => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(flush, FLUSH_DELAY_MS);
    });

    return () => {
      unsubscribe();
      if (timer) {
        clearTimeout(timer);
        // Leaving the page mid-burst must not lose the last few ticks.
        flush();
      }
    };
  }, [uid, programCode]);
}
