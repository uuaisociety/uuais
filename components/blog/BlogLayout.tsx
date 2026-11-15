'use client';

// The blog's static pieces, shared by the page and its loading skeleton (the
// /blog loading boundary), so the skeleton has the page's exact geometry.
// Kept free of the page's data clients: the boundary ships ahead of the page.

import React from 'react';
import Link from 'next/link';
import { Calendar, User, Search, Sparkles, Rss } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import Tag from '@/components/ui/Tag';
import HeroSplash from '@/components/HeroSplash';
import {
  SkeletonBox,
  SkeletonRegion,
  SkeletonText,
} from '@/components/ui/skeleton';
import { TagBar } from '@/components/ui/TagBar';

export const PAGE_CLASS = 'min-h-screen bg-background transition-colors pb-24';
export const CONTENT_CLASS = 'max-w-7xl mx-auto px-5 sm:px-8';
export const TOOLBAR_CLASS =
  'flex flex-wrap items-center justify-between gap-4 pt-5';
export const SEARCH_TRIGGER_CLASS =
  'inline-flex items-center gap-1.5 h-9 px-2.5 rounded-md text-current/60';
export const SECTIONS_CLASS = 'mt-8 space-y-14';
export const GRID_CLASS = 'grid sm:grid-cols-2 lg:grid-cols-3 gap-5';
export const CARD_CLASS = 'h-full flex flex-col';
export const CARD_MEDIA_CLASS = 'aspect-[16/10]';
export const CARD_BODY_CLASS = 'p-5 flex flex-col flex-1';
export const CARD_TAGS_CLASS = 'flex flex-wrap gap-2 mb-3';
export const CARD_TITLE_CLASS = 'text-lg font-semibold text-foreground mb-3';
export const CARD_EXCERPT_CLASS =
  'text-muted-foreground text-sm mb-5 line-clamp-3';
export const CARD_META_CLASS =
  'mt-auto flex items-center gap-4 text-xs text-muted-foreground';
export const FEATURED_BODY_CLASS = 'md:w-1/2 p-8';
export const FEATURED_TITLE_CLASS = 'text-2xl font-bold text-foreground mb-4';
export const FEATURED_EXCERPT_CLASS =
  'text-muted-foreground mb-6 leading-relaxed';
export const FEATURED_META_CLASS =
  'flex items-center gap-5 text-sm text-muted-foreground';

export const BlogHero = () => (
  <HeroSplash>
    <div className="relative z-10 max-w-7xl mx-auto px-6 sm:px-8 pt-32 pb-20">
      <p className="mono-label text-current/65 mb-6">
        UU AI Society · What&apos;s new
      </p>
      <h1 className="display-lg mb-4">Blog</h1>
      <p className="text-base sm:text-lg text-current/65 max-w-2xl leading-relaxed">
        News and insights from the UU AI Society — editorials from our team and
        AI-generated digests from the AI News Desk.
      </p>
    </div>
  </HeroSplash>
);

export const SectionHead = ({
  eyebrow,
  title,
}: {
  eyebrow: React.ReactNode;
  title: string;
}) => (
  <>
    <p className="mono-label text-muted-foreground mb-2">{eyebrow}</p>
    <h2 className="display-md text-foreground mb-8">{title}</h2>
  </>
);

export const RssLink = () => (
  <div className="mt-16 flex justify-center">
    <Link
      href="/blog/rss.xml"
      aria-label="Subscribe via RSS"
      className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
    >
      <Rss className="h-3.5 w-3.5" aria-hidden />
      Subscribe via RSS
    </Link>
  </div>
);

// AI News Desk cards always carry their two stream tags, which can wrap the tag row.
const CardSkeletons = ({ ai = false }: { ai?: boolean }) => (
  <div className={GRID_CLASS}>
    {[0, 1, 2].map((i) => (
      <Card key={i} variant="glass" className={CARD_CLASS} aria-hidden>
        {/* CardMedia's own box (h-48) plus the page's class. */}
        <SkeletonBox className={`w-full h-48 ${CARD_MEDIA_CLASS}`} />
        <CardContent className={CARD_BODY_CLASS}>
          <div className={CARD_TAGS_CLASS}>
            {ai && (
              <>
                <Tag variant="blue" size="sm">
                  <Sparkles className="h-3 w-3 mr-1" />
                  AI News Desk
                </Tag>
                <Tag variant="green" size="sm">
                  Beta
                </Tag>
              </>
            )}
            <TagBar size="sm" />
            <TagBar size="sm" />
          </div>
          <SkeletonText className={CARD_TITLE_CLASS} lines={2} />
          <SkeletonText className={CARD_EXCERPT_CLASS} lines={3} />
          <div className={CARD_META_CLASS}>
            <span className="inline-flex items-center gap-1.5">
              <User className="h-3.5 w-3.5" />
              <SkeletonText className="mono-meta" widths={['5rem']} />
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              <SkeletonText className="mono-meta" widths={['5.5rem']} />
            </span>
          </div>
        </CardContent>
      </Card>
    ))}
  </div>
);

/** The blog while its posts load: the real hero and section heads, with the featured article and post cards as placeholders. */
export const BlogSkeleton = () => (
  <SkeletonRegion label="Loading articles…" className={PAGE_CLASS}>
    <BlogHero />
    <div className={CONTENT_CLASS}>
      <div className={TOOLBAR_CLASS}>
        <div className="ml-auto">
          <span aria-hidden className={SEARCH_TRIGGER_CLASS}>
            <Search className="h-4 w-4" />
            <span className="text-xs font-medium">Search</span>
          </span>
        </div>
      </div>
      <div className={SECTIONS_CLASS}>
        <div>
          <SectionHead eyebrow={"Editor's pick"} title="Featured Article" />
          <Card variant="glass" className="overflow-hidden" aria-hidden>
            <div className="md:flex">
              <div className="md:w-1/2">
                <SkeletonBox className="w-full h-64 md:h-full" />
              </div>
              <div className={FEATURED_BODY_CLASS}>
                <div className="flex flex-wrap gap-2 mb-4">
                  <Tag variant="yellow" size="md">
                    Featured
                  </Tag>
                  <TagBar size="md" />
                  <TagBar size="md" />
                </div>
                <SkeletonText className={FEATURED_TITLE_CLASS} lines={2} />
                <SkeletonText className={FEATURED_EXCERPT_CLASS} lines={3} />
                <div className={FEATURED_META_CLASS}>
                  <span className="inline-flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <SkeletonText className="mono-meta" widths={['6rem']} />
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <SkeletonText className="mono-meta" widths={['6rem']} />
                  </span>
                </div>
              </div>
            </div>
          </Card>
        </div>
        <div>
          <SectionHead eyebrow="The team" title="From the Team" />
          <CardSkeletons />
        </div>
        <div>
          <SectionHead eyebrow="Automated coverage" title="AI News Desk" />
          <CardSkeletons ai />
        </div>
      </div>
      <RssLink />
    </div>
  </SkeletonRegion>
);
