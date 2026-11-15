'use client';

// The showcase's static pieces, shared by the page and its loading skeleton
// (the /showcase loading boundary), so the skeleton has the page's exact
// geometry. Kept free of the page's data clients: the boundary ships ahead of
// the page.

import React from 'react';
import { Search } from 'lucide-react';
import { buttonVariants } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import HeroSplash from '@/components/HeroSplash';
import {
  SkeletonBox,
  SkeletonRegion,
  SkeletonText,
} from '@/components/ui/skeleton';
import { TagBar } from '@/components/ui/TagBar';

export type SortKey = 'newest' | 'votes';

export const SORTS: { key: SortKey; label: string }[] = [
  { key: 'newest', label: 'Newest' },
  { key: 'votes', label: 'Most voted' },
];

export const PAGE_CLASS = 'min-h-screen bg-background transition-colors pb-24';
export const CONTENT_CLASS = 'mx-auto max-w-7xl px-5 sm:px-8';
export const TOOLBAR_CLASS =
  'flex flex-col gap-4 pt-10 lg:flex-row lg:items-start lg:justify-between';
export const chipClass = (active: boolean) =>
  `inline-flex min-h-9 items-center gap-1.5 rounded-md border px-3 mono-label transition-colors duration-300 ${
    active
      ? 'border-primary/30 bg-primary/[0.07] text-primary'
      : 'border-border text-muted-foreground hover:border-foreground/25 hover:text-foreground'
  }`;
export const SORT_GROUP_CLASS =
  'flex items-center gap-1 rounded-md border border-border p-0.5';
export const sortClass = (active: boolean) =>
  `inline-flex min-h-9 items-center rounded-sm px-2.5 mono-label transition-colors duration-300 ${
    active
      ? 'bg-foreground/[0.07] text-foreground'
      : 'text-muted-foreground hover:text-foreground'
  }`;
export const SEARCH_WRAP_CLASS = 'relative w-full sm:w-64';
export const SEARCH_ICON_CLASS =
  'pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground';
export const SEARCH_INPUT_CLASS =
  'min-h-10 w-full rounded-md border border-border bg-card py-2 pl-9 pr-3 text-sm';
export const LEAD_CLASS = 'mt-10 overflow-hidden';
export const LEAD_GRID_CLASS = 'grid md:grid-cols-2';
export const LEAD_COVER_CLASS =
  'aspect-[16/10] md:aspect-auto md:h-full md:min-h-[22rem]';
export const LEAD_BODY_CLASS = 'flex flex-col justify-center p-6 sm:p-10';
export const GRID_CLASS = 'grid gap-5 sm:grid-cols-2 lg:grid-cols-3';
export const CARD_CLASS = 'h-full flex flex-col';
export const CARD_BODY_CLASS = 'flex flex-1 flex-col p-5';
export const CARD_TITLE_CLASS =
  'mb-2 text-[1.0625rem] font-semibold leading-snug tracking-[-0.02em] break-words';
export const CARD_EXCERPT_CLASS =
  'mb-4 line-clamp-3 break-words text-sm leading-relaxed text-muted-foreground';
export const CARD_FOOTER_CLASS =
  'mt-auto flex items-center justify-between gap-2 border-t border-border pt-4';

export const ShowcaseHero = ({ action }: { action: React.ReactNode }) => (
  <HeroSplash>
    <div className="relative z-10 mx-auto max-w-7xl px-6 pt-32 pb-20 sm:px-8">
      <p className="mono-label text-current/65 mb-6">
        UU AI Society · Built by members
      </p>
      <h1 className="display-lg mb-4">Showcase</h1>
      <p className="max-w-2xl text-base leading-relaxed text-current/65 sm:text-lg">
        AI projects built by members of the society — from weekend hackathon
        builds to ongoing research prototypes. Every project here was made by an
        Uppsala student.
      </p>
      {action}
    </div>
  </HeroSplash>
);

export const MoreHead = ({ count }: { count: React.ReactNode }) => (
  <div className="mb-8 flex items-end justify-between gap-6">
    <h2 className="display-md">
      <span className="paren">(More)</span> projects
    </h2>
    <span className="mono-label shrink-0 text-muted-foreground">{count}</span>
  </div>
);

/** The lead project and the card grid while the projects load. */
export const ShowcaseContentSkeleton = () => (
  <div aria-hidden>
    <Card variant="glass" className={LEAD_CLASS}>
      <div className={LEAD_GRID_CLASS}>
        <SkeletonBox className={LEAD_COVER_CLASS} />
        <div className={LEAD_BODY_CLASS}>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <SkeletonText className="mono-label" widths={['7rem']} />
          </div>
          <SkeletonText className="display-md mb-3" widths={['70%']} />
          <SkeletonText
            className="mb-6 max-w-prose leading-relaxed"
            lines={3}
          />
          <SkeletonText className="mono-meta" widths={['40%']} />
        </div>
      </div>
    </Card>
    <div className="mt-14">
      <MoreHead count={<SkeletonText widths={['5.5rem']} />} />
      <div className={GRID_CLASS}>
        {[0, 1, 2].map((i) => (
          <Card key={i} variant="glass" className={CARD_CLASS}>
            <SkeletonBox className="aspect-[16/10]" />
            <CardContent className={CARD_BODY_CLASS}>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <SkeletonText className="mono-label" widths={['6rem']} />
              </div>
              <SkeletonText className={CARD_TITLE_CLASS} widths={['75%']} />
              <SkeletonText className={CARD_EXCERPT_CLASS} lines={3} />
              <div className="mb-4 flex flex-wrap gap-2">
                <TagBar size="sm" />
                <TagBar size="sm" />
              </div>
              <div className={CARD_FOOTER_CLASS}>
                <SkeletonText className="mono-meta" widths={['7rem']} />
                {/* The vote button's footprint (min-h-11). */}
                <SkeletonBox className="h-11 w-16 rounded-md" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  </div>
);

/**
 * The showcase before its route has loaded: the real hero and toolbar, with the
 * projects as placeholders. Controls are drawn, not wired; the page brings them.
 */
export const ShowcaseSkeleton = () => (
  <SkeletonRegion label="Loading projects…" className={PAGE_CLASS}>
    <ShowcaseHero
      action={
        <span
          aria-hidden
          className={`${buttonVariants({ variant: 'cta' })} mt-8 pointer-events-none`}
        >
          Share your project
        </span>
      }
    />
    <div className={CONTENT_CLASS}>
      <div aria-hidden className={TOOLBAR_CLASS}>
        <div className="flex flex-wrap gap-2">
          <span className={chipClass(true)}>
            All
            <SkeletonText className="opacity-60" widths={['0.5rem']} />
          </span>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-3">
          <div className={SORT_GROUP_CLASS}>
            {SORTS.map((s) => (
              <span key={s.key} className={sortClass(s.key === 'newest')}>
                {s.label}
              </span>
            ))}
          </div>
          <div className={SEARCH_WRAP_CLASS}>
            <Search className={SEARCH_ICON_CLASS} />
            <span
              className={`${SEARCH_INPUT_CLASS} block text-muted-foreground`}
            >
              Search projects
            </span>
          </div>
        </div>
      </div>
      <ShowcaseContentSkeleton />
    </div>
  </SkeletonRegion>
);
