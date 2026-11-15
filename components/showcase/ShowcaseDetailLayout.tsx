'use client';

// A project page's static pieces, shared by the page and its loading skeleton
// (the /showcase loading boundaries), so the skeleton has the page's exact
// geometry. Kept free of the page's data clients: the boundaries ship ahead of
// the page.

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import {
  SkeletonBox,
  SkeletonRegion,
  SkeletonText,
} from '@/components/ui/skeleton';
import { TagBar } from '@/components/ui/TagBar';

export const PAGE_CLASS = 'min-h-screen bg-background transition-colors pb-24';
export const COLUMN_CLASS = 'mx-auto max-w-5xl px-5 pt-24 sm:px-8';
export const TITLE_CLASS = 'display-lg break-words';
export const DESCRIPTION_CLASS =
  'mt-5 max-w-prose break-words text-lg leading-relaxed text-muted-foreground';
export const COVER_CLASS = 'aspect-[16/9]';
export const BODY_GRID_CLASS =
  'mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_16rem] lg:gap-14';
export const ASIDE_CLASS = 'lg:sticky lg:top-20 lg:self-start';
export const FACTS_CLASS = 'rounded-xl border border-border bg-card/70 p-5';
export const FACT_LABEL_CLASS = 'mono-label text-muted-foreground';
export const ACTIONS_CLASS =
  'mt-6 flex flex-col gap-2 border-t border-border pt-5';

export const BackToShowcase = () => (
  <Link
    href="/showcase"
    className="mb-8 inline-flex min-h-9 items-center gap-2 text-sm text-muted-foreground transition-colors duration-300 hover:text-foreground"
  >
    <ArrowLeft className="h-4 w-4" aria-hidden /> Back to showcase
  </Link>
);

/** A project while the showcase loads: the real back link, section heads and fact labels, with bars for the project. */
export const ShowcaseDetailSkeleton = () => (
  <SkeletonRegion label="Loading project…" className={PAGE_CLASS}>
    <div className={COLUMN_CLASS}>
      <BackToShowcase />
      <div className="mb-8">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <SkeletonText className="mono-label" widths={['7rem']} />
        </div>
        <SkeletonText className={TITLE_CLASS} widths={['65%']} />
        <SkeletonText className={DESCRIPTION_CLASS} lines={2} />
      </div>
      <Card variant="glass" className="overflow-hidden" aria-hidden>
        <SkeletonBox className={COVER_CLASS} />
      </Card>
      <div className={BODY_GRID_CLASS}>
        <div className="min-w-0">
          <section>
            <h2 className="display-md mb-5">
              <span className="paren">(About)</span> this project
            </h2>
            <SkeletonText className="max-w-prose leading-relaxed" lines={4} />
          </section>
          <section className="mt-12">
            <h3 className="mono-label mb-3 text-muted-foreground">
              Built with
            </h3>
            <div aria-hidden className="flex flex-wrap gap-2">
              <TagBar size="sm" />
              <TagBar size="sm" />
              <TagBar size="sm" />
            </div>
          </section>
        </div>
        <aside className={ASIDE_CLASS}>
          <div className={FACTS_CLASS}>
            <dl className="space-y-4">
              <div>
                <dt className={FACT_LABEL_CLASS}>Built by</dt>
                <dd className="mt-1">
                  <SkeletonText
                    className="text-sm font-medium"
                    widths={['8rem']}
                  />
                </dd>
              </div>
              <div>
                <dt className={FACT_LABEL_CLASS}>Votes</dt>
                <dd className="mt-1">
                  <SkeletonText
                    className="font-mono text-2xl font-semibold"
                    widths={['2.5rem']}
                  />
                </dd>
              </div>
              <div>
                <dt className={FACT_LABEL_CLASS}>Added</dt>
                <dd className="mt-1">
                  <SkeletonText className="text-sm" widths={['7.5rem']} />
                </dd>
              </div>
            </dl>
            {/* The vote and share buttons' footprint (h-10 each). */}
            <div aria-hidden className={ACTIONS_CLASS}>
              <SkeletonBox className="h-10 w-full rounded-md" />
              <SkeletonBox className="h-10 w-full rounded-md" />
            </div>
          </div>
        </aside>
      </div>
    </div>
  </SkeletonRegion>
);
