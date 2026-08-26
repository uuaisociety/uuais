'use client'

import { useEffect, useRef, useState } from 'react';
import { useNotify } from '@/components/ui/Notifications';
import type { ShowcaseProject } from '@/types';

const VOTED_STORAGE_KEY = 'showcaseVoted';

function storageKeyFor(userId?: string | null) {
  return userId ? `${VOTED_STORAGE_KEY}:${userId}` : VOTED_STORAGE_KEY;
}

function readVotedIds(key: string): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function writeVotedIds(key: string, ids: string[]) {
  try {
    window.localStorage.setItem(key, JSON.stringify(ids));
  } catch {
    /* ignore */
  }
}

export function useShowcaseVote(userId?: string | null) {
  const { notify } = useNotify();
  const key = storageKeyFor(userId);
  const [voted, setVoted] = useState<string[]>(() => readVotedIds(key));
  // Server truth for counts this session, so a vote and an unvote both land immediately.
  const [localCounts, setLocalCounts] = useState<Record<string, number>>({});
  const [lastUserId, setLastUserId] = useState(userId);
  // In-flight guard so rapid taps can't double-submit while the request is out.
  const pendingRef = useRef<Set<string>>(new Set());
  const [pending, setPending] = useState<string[]>([]);

  if (userId !== lastUserId) {
    setLastUserId(userId);
    setVoted(readVotedIds(storageKeyFor(userId)));
    setLocalCounts({});
    // A request still out belongs to the previous user; its `finally` clears the ref.
    setPending([]);
  }

  const votesFor = (p: ShowcaseProject) =>
    p.id in localCounts ? localCounts[p.id] : p.votes || 0;

  const markPending = (id: string, on: boolean) => {
    if (on) pendingRef.current.add(id);
    else pendingRef.current.delete(id);
    setPending(Array.from(pendingRef.current));
  };

  // Functional, so two concurrent votes cannot each write from the same stale snapshot.
  const applyVote = (id: string, add: boolean) =>
    setVoted((prev) =>
      add ? (prev.includes(id) ? prev : [...prev, id]) : prev.filter((v) => v !== id),
    );

  // Persisted here rather than inside the updater, which must stay pure.
  useEffect(() => {
    writeVotedIds(key, voted);
  }, [key, voted]);

  /** Toggle this member's vote — casting and withdrawing share one control. */
  const handleVote = async (p: ShowcaseProject) => {
    if (pendingRef.current.has(p.id)) return;
    const removing = voted.includes(p.id);
    markPending(p.id, true);
    try {
      const res = await fetch('/api/showcase/vote', {
        method: removing ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: p.id }),
      });

      if (res.status === 401) {
        notify({ type: 'error', title: 'Members only', message: 'Sign in as a member to vote for projects.' });
        return;
      }

      // 409 means the server already agrees with where we were heading; adopt its view.
      if (res.status === 409) {
        applyVote(p.id, !removing);
        return;
      }

      if (!res.ok) {
        notify({
          type: 'error',
          title: removing ? 'Could not remove vote' : 'Vote failed',
          message: 'Something went wrong. Please try again.',
        });
        return;
      }

      const data = (await res.json()) as { votes: number };
      applyVote(p.id, !removing);
      setLocalCounts((c) => ({ ...c, [p.id]: data.votes ?? 0 }));
    } catch {
      notify({
        type: 'error',
        title: removing ? 'Could not remove vote' : 'Vote failed',
        message: 'Something went wrong. Please try again.',
      });
    } finally {
      markPending(p.id, false);
    }
  };

  return { voted, pending, votesFor, handleVote };
}
