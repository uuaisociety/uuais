'use client';

// The team section's placeholders and the card geometry they share with the
// member cards. Kept apart so the about page's loading boundary doesn't pull in
// the whole section (its tabs, year picker and icons).

import { Card } from '@/components/ui/Card';
import {
  SkeletonBox,
  SkeletonRegion,
  SkeletonText,
} from '@/components/ui/skeleton';

// Shared by the member cards and their loading placeholders.
export const TEAM_GRID = 'grid sm:grid-cols-2 lg:grid-cols-3 gap-5';
export const TEAM_CARD = 'p-6 flex flex-col';
export const TEAM_CARD_HEAD = 'flex items-start gap-4 mb-4';

const TeamCardSkeleton = () => (
  <Card variant="glass" className={TEAM_CARD} aria-hidden>
    <div className={TEAM_CARD_HEAD}>
      <SkeletonBox className="w-16 h-16 rounded-full shrink-0" />
      <div className="min-w-0 flex-1">
        <SkeletonText className="text-[1.0625rem]" widths={['65%']} />
        <SkeletonText className="text-sm mt-0.5" widths={['45%']} />
      </div>
    </div>
    <SkeletonText className="text-sm leading-relaxed mb-5" lines={2} />
    <SkeletonBox className="size-9 rounded-sm mt-auto" />
  </Card>
);

const TeamCardsSkeleton = () => (
  <div aria-hidden className={TEAM_GRID}>
    <TeamCardSkeleton />
    <TeamCardSkeleton />
    <TeamCardSkeleton />
  </div>
);

/** The member grid while profiles load. */
export const TeamGridSkeleton = () => (
  <SkeletonRegion label="Loading team profiles...">
    <TeamCardsSkeleton />
  </SkeletonRegion>
);

/** The whole section before anything is known (inside a page skeleton, which announces the load): the team tabs row, then the grid. */
export const TeamSectionSkeleton = () => (
  <div aria-hidden>
    <div className="mb-10">
      <div className="flex gap-2 p-1">
        {['w-24', 'w-32', 'w-28'].map((w) => (
          <SkeletonBox key={w} className={`h-10 rounded-md ${w}`} />
        ))}
      </div>
    </div>
    <TeamCardsSkeleton />
  </div>
);
