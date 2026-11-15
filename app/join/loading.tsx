'use client';

import { JoinSkeleton } from '@/components/pages/JoinLayout';
import { useAdmin } from '@/hooks/useAdmin';

// Shown straight away: it is the page's own frame. A returning visitor (cached
// identity) gets the details step, which is what the page shows them next.
export default function Loading() {
  const { cached } = useAdmin();
  return <JoinSkeleton cached={cached} />;
}
