'use client';

import { usePathname } from 'next/navigation';
import { HomeSkeleton } from '@/components/pages/HomeLayout';
import { RouteFallback } from '@/components/layout/RouteFallback';

/**
 * Route-level loading state for the home page and for any route without its own
 * loading.tsx. The home page gets its skeleton straight away: it is the page's
 * own frame, so nothing jumps when the content arrives. Elsewhere the layout
 * isn't known here, so a debounced blank stands in instead of a guessed shape.
 */
export default function Loading() {
  return usePathname() === '/' ? <HomeSkeleton /> : <RouteFallback />;
}
