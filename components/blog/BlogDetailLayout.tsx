'use client';

// An article's static pieces, shared by the page and its loading skeleton (the
// /blog loading boundaries), so the skeleton has the page's exact geometry.
// Kept free of the page's data clients: the boundaries ship ahead of the page.

import Link from 'next/link';
import { ArrowLeft, Calendar, User, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  SkeletonBox,
  SkeletonRegion,
  SkeletonText,
} from '@/components/ui/skeleton';
import { TagBar } from '@/components/ui/TagBar';

export const PAGE_CLASS = 'min-h-screen bg-background pt-24 pb-24';
export const COLUMN_CLASS = 'max-w-4xl mx-auto px-4 sm:px-6 lg:px-8';
export const TITLE_CLASS = 'text-4xl font-bold text-foreground mb-4';
export const META_CLASS =
  'flex flex-wrap items-center gap-x-5 gap-y-2 text-muted-foreground mb-6';
export const TAGS_CLASS = 'flex flex-wrap gap-2 mb-6';
export const EXCERPT_CLASS = 'text-xl text-muted-foreground leading-relaxed';
export const IMAGE_CLASS = 'w-full h-64 sm:h-80 md:h-96 rounded-xl';
export const PROSE_CLASS =
  'prose prose-lg max-w-xl mx-auto dark:prose-invert prose-headings:text-foreground prose-p:text-muted-foreground prose-a:text-primary prose-strong:text-foreground prose-li:text-muted-foreground prose-blockquote:text-muted-foreground';

export const BackToBlog = () => (
  <Link href="/blog">
    <Button variant="outline" className="min-h-11 mb-8" icon={ArrowLeft}>
      Back to Blog
    </Button>
  </Link>
);

const MetaBar = ({
  icon: Icon,
  width,
}: {
  icon: typeof User;
  width: string;
}) => (
  <span className="inline-flex items-center gap-2">
    <Icon className="w-4 h-4" aria-hidden />
    <SkeletonText className="mono-meta" widths={[width]} />
  </span>
);

/** An article while the posts load: the real back link, then the header, image and body as placeholders. */
export const BlogDetailSkeleton = () => (
  <SkeletonRegion label="Loading article…" className={PAGE_CLASS}>
    <div className={COLUMN_CLASS}>
      <BackToBlog />
      <div className="mb-8">
        <SkeletonText className={TITLE_CLASS} lines={2} />
        <div className={META_CLASS}>
          <MetaBar icon={User} width="6rem" />
          <MetaBar icon={Calendar} width="8rem" />
          <MetaBar icon={Clock} width="5rem" />
        </div>
        <div className={TAGS_CLASS}>
          <TagBar size="md" />
          <TagBar size="md" />
        </div>
        <SkeletonText className={EXCERPT_CLASS} lines={2} />
      </div>
      <div className="mb-8">
        <SkeletonBox className={IMAGE_CLASS} />
      </div>
      <Card className="h-full pt-4" aria-hidden>
        <CardContent className="p-8">
          <SkeletonText className={PROSE_CLASS} lines={8} />
        </CardContent>
      </Card>
    </div>
  </SkeletonRegion>
);
