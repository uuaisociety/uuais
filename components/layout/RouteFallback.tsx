'use client';

import { Delayed, SkeletonRegion } from '@/components/ui/skeleton';

/**
 * Loading state for a route whose shape isn't known here. It draws nothing (so
 * it never flashes some other page's layout) and only after ~150ms, so a fast
 * load goes straight to the page; screen readers still hear that it's loading.
 */
export const RouteFallback = () => (
  <Delayed>
    <SkeletonRegion label="Loading…" className="min-h-screen" />
  </Delayed>
);

export default RouteFallback;
