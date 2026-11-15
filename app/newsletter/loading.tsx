'use client';

import { NewsletterSkeleton } from '@/components/pages/NewsletterLayout';
import { useAdmin } from '@/hooks/useAdmin';

// Shown straight away: it is the page's own card, with the panel the visitor
// will most likely see (a member's, if someone was signed in here before).
export default function Loading() {
  const { cached } = useAdmin();
  return <NewsletterSkeleton cached={cached} />;
}
