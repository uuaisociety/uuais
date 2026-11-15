'use client';

import { usePathname } from 'next/navigation';
import { RouteFallback } from '@/components/layout/RouteFallback';
import {
  PARTNERS_PAGE_CLASS,
  PartnersHero,
} from '@/components/partners/PartnersLayout';
import { CvReviewSkeleton } from '@/components/partners/CvReviewLayout';
import { SkeletonRegion } from '@/components/ui/skeleton';
import { PARTNERS_PAGE_PUBLIC } from '@/lib/feature-flags';

// The page is static, so only its hero stands in: the partner tiers render
// below it and nothing above them moves. While the page is hidden (a 404),
// nothing partner-shaped flashes first. A navigation prefetches only down to the
// first loading boundary, which is this one for /partners/cvs too.
export default function Loading() {
  if (usePathname() !== '/partners') return <CvReviewSkeleton />;
  if (!PARTNERS_PAGE_PUBLIC) return <RouteFallback />;
  return (
    <SkeletonRegion label="Loading partners…" className={PARTNERS_PAGE_CLASS}>
      <PartnersHero />
    </SkeletonRegion>
  );
}
