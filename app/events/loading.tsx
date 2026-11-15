'use client';

import { usePathname } from 'next/navigation';
import { EventsSkeleton } from '@/components/events/EventsLayout';
import { EventDetailSkeleton } from '@/components/events/EventDetailLayout';
import { RouteFallback } from '@/components/layout/RouteFallback';

// Shown straight away: it is the page's own frame, so there is nothing to pop.
// A navigation prefetches only down to the first loading boundary, which is this
// one for every /events/* route, so it stands in for the nested pages too.
export default function Loading() {
  const pathname = usePathname();
  if (pathname === '/events') return <EventsSkeleton />;
  if (pathname === '/events/codex-ambassador-interview')
    return <RouteFallback />;
  return <EventDetailSkeleton />;
}
