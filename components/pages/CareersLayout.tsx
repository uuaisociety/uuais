'use client';

// The job board's static pieces, shared by the page and its loading skeleton
// (the /careers loading boundary), so the skeleton has the page's exact
// geometry and nothing jumps when the roles arrive. Kept free of the page's
// data clients: the boundary ships ahead of the page.

import React from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import HeroSplash from '@/components/HeroSplash';
import {
  SkeletonBox,
  SkeletonRegion,
  SkeletonText,
} from '@/components/ui/skeleton';

const FILTERS = [
  { value: 'all', label: 'Show all' },
  { value: 'internships', label: 'Internships & Master thesis' },
  { value: 'startup', label: 'Startups' },
  { value: 'jobs', label: 'Jobs' },
  { value: 'other', label: 'Other' },
] as const;

export type FilterValue = (typeof FILTERS)[number]['value'];

export const PAGE = 'min-h-screen bg-background transition-colors pb-24';
export const COLUMN = 'max-w-6xl mx-auto px-5 sm:px-8 -mt-8';
export const RESULTS = 'space-y-4 pt-10';
export const JOB_LIST = 'grid gap-4';
export const JOB_CARD = 'p-5 sm:p-6';
export const JOB_ROW =
  'flex flex-col sm:flex-row items-start justify-between gap-4';
export const JOB_HEAD =
  'flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 mb-3';
export const JOB_TITLE =
  'text-[1.0625rem] font-semibold tracking-[-0.02em] text-foreground';
export const JOB_PROSE =
  'prose prose-lg max-w-none dark:prose-invert prose-headings:text-foreground prose-p:text-muted-foreground break-words';

export const CareersHero = () => (
  <HeroSplash>
    <div className="relative z-10 max-w-6xl mx-auto px-6 sm:px-8 pt-32 pb-20">
      <p className="mono-label text-current/65 mb-6">
        UU AI Society · Job board
      </p>
      <h1 className="display-lg mb-4">Job board</h1>
      <p className="text-base sm:text-lg text-current/60 max-w-2xl leading-relaxed">
        Startups, internships, master&apos;s theses, and jobs from the UU AI
        Society network.
      </p>
    </div>
  </HeroSplash>
);

export function CareersFilters({
  filter,
  onFilterChange,
  count,
}: {
  filter: FilterValue;
  onFilterChange: (value: FilterValue) => void;
  count?: React.ReactNode;
}) {
  return (
    <div className="glass rounded-lg p-5 sm:p-6 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="mono-label text-muted-foreground">Filter by type</p>
        <div
          className="flex flex-wrap gap-2"
          role="group"
          aria-label="Job filters"
        >
          {FILTERS.map((f) => (
            <Button
              key={f.value}
              variant={filter === f.value ? 'secondary' : 'outline'}
              onClick={() => onFilterChange(f.value)}
              aria-pressed={filter === f.value}
            >
              {f.label}
            </Button>
          ))}
        </div>
      </div>
      {count && <p className="mono-meta text-muted-foreground">{count}</p>}
    </div>
  );
}

export const PostARole = () => (
  <footer className="pt-12 text-center">
    <p className="mono-meta text-muted-foreground">
      Want to post a role? Contact us at{' '}
      <a
        href="mailto:alexander.andersson@uuais.com"
        className="underline underline-offset-4 hover:text-foreground transition-colors duration-300"
      >
        alexander.andersson@uuais.com
      </a>
    </p>
  </footer>
);

/** A role while it loads: title and company tags, a few lines of description, the link on the right. */
const JobItemSkeleton = () => (
  <Card variant="glass" className={JOB_CARD} aria-hidden>
    <div className={JOB_ROW}>
      <div className="flex-1 min-w-0 w-full">
        <div className={JOB_HEAD}>
          <SkeletonText className={JOB_TITLE} widths={['14rem']} />
          <SkeletonBox className="h-6 w-24 rounded-sm" />
        </div>
        {/* A typical description: three lines wide, about twice that on a phone. */}
        <div className={JOB_PROSE}>
          <SkeletonText lines={3} widths={['100%', '100%', '100%']} />
          <SkeletonText className="sm:hidden" lines={3} />
        </div>
      </div>
      <SkeletonBox className="h-8 w-48 rounded-md shrink-0" />
    </div>
  </Card>
);

const noop = () => {};

/** The job board while it loads: the real hero and filters (inert), and placeholder roles. */
export const CareersSkeleton = () => (
  <SkeletonRegion label="Loading roles…" className={PAGE}>
    <CareersHero />
    <div className={COLUMN}>
      <div inert>
        <CareersFilters
          filter="all"
          onFilterChange={noop}
          count={<SkeletonText className="inline-block" widths={['3.5rem']} />}
        />
      </div>
      <section className={RESULTS}>
        <div className={JOB_LIST}>
          <JobItemSkeleton />
          <JobItemSkeleton />
          <JobItemSkeleton />
        </div>
      </section>
      <PostARole />
    </div>
  </SkeletonRegion>
);
