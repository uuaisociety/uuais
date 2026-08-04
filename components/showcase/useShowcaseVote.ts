'use client'

import { useState } from 'react';
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

  if (userId !== lastUserId) {
    setLastUserId(userId);
    setVoted(readVotedIds(storageKeyFor(userId)));
    setLocalAdditions({});
  }

  const votesFor = (p: ShowcaseProject) => p.votes + (localAdditions[p.id] || 0);

  const handleVote = async (p: ShowcaseProject) => {
    if (voted.includes(p.id)) return;
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
      setLocalAdditions((a) => ({ ...a, [p.id]: data.votes - p.votes }));
    } catch {
      notify({ type: 'error', title: 'Vote failed', message: 'Something went wrong. Please try again.' });
    }
  };

  return { voted, votesFor, handleVote };
}
