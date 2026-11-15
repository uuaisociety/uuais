'use client';

import { GuessSkeleton } from '@/components/pages/GuessPage';
import { useAdmin } from '@/hooks/useAdmin';

// Shown straight away: it is the page's own card, with the guess form for
// someone signed in here before and the sign-in prompt otherwise.
export default function Loading() {
  const { cached } = useAdmin();
  return <GuessSkeleton signedIn={Boolean(cached)} />;
}
