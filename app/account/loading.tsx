'use client';

import { AccountSkeleton } from '@/components/account/AccountLayout';
import { useAdmin } from '@/hooks/useAdmin';

// Shown straight away: it is the page's own frame, so there is nothing to pop.
export default function Loading() {
  const { cached } = useAdmin();
  return <AccountSkeleton cached={cached} />;
}
