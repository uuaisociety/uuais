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
  const [localAdditions, setLocalAdditions] = useState<Record<string, number>>({});
  const [lastUserId, setLastUserId] = useState(userId);
  // In-flight guard so rapid taps can't double-vote while the request is out.
  const pendingRef = useRef<Set<string>>(new Set());

  if (userId !== lastUserId) {
    setLastUserId(userId);
    setVoted(readVotedIds(storageKeyFor(userId)));
    setLocalAdditions({});
  }

  // Clear any in-flight guard when the active user changes.
  useEffect(() => {
    pendingRef.current = new Set();
  }, [userId]);

  const votesFor = (p: ShowcaseProject) => (p.votes || 0) + (localAdditions[p.id] || 0);

  const handleVote = async (p: ShowcaseProject) => {
    if (voted.includes(p.id) || pendingRef.current.has(p.id)) return;
    pendingRef.current.add(p.id);
    try {
      const res = await fetch('/api/showcase/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: p.id }),
      });
      if (res.status === 401) {
        notify({ type: 'error', title: 'Members only', message: 'Sign in as a member to vote for projects.' });
        return;
      }
      if (res.status === 409) {
        const next = [...voted, p.id];
        setVoted(next);
        writeVotedIds(key, next);
        return;
      }
      if (!res.ok) {
        notify({ type: 'error', title: 'Vote failed', message: 'Something went wrong. Please try again.' });
        return;
      }
      const data = (await res.json()) as { votes: number };
      const next = [...voted, p.id];
      setVoted(next);
      writeVotedIds(key, next);
      setLocalAdditions((a) => ({ ...a, [p.id]: (data.votes || 0) - (p.votes || 0) }));
    } catch {
      notify({ type: 'error', title: 'Vote failed', message: 'Something went wrong. Please try again.' });
    } finally {
      pendingRef.current.delete(p.id);
    }
  };

  return { voted, votesFor, handleVote };
}
