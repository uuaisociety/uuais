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
  /** Whether `written` is known at all; until it is, a write would race the account's own state. */
  const hydrated = useRef(false);
  const hydratedFor = useRef<string | null>(null);

  useEffect(() => {
    if (loading || !uid) {
      written.current = null;
      hydrated.current = false;
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
        const stored = remote?.[programCode];
        if (stored) {
          written.current = [...stored].sort().join(',');
          saveManualPassed(programCode, new Set(stored));
        } else {
          // Nothing stored for this programme — whether or not the account holds others — so the
          // browser's marks become the starting point rather than being wiped by an absent entry.
          const local = getManualPassedSnapshot(programCode);
          if (local.size > 0) await store.writeProgramPassed(uid, programCode, [...local]);
          written.current = serialise(local);
        }
        hydrated.current = true;
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
      if (!hydrated.current || next === written.current) return;
      // Assume the write lands so a burst collapses, but keep what the account actually held:
      // restoring it on failure is what lets the next change retry instead of stalling for good.
      const previous = written.current;
      written.current = next;
      void import('@/lib/firestore/program-progress')
        .then((store) =>
          store.writeProgramPassed(uid, programCode, next ? next.split(',') : [])
        )
        .catch(() => {
          written.current = previous;
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
