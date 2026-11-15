// The CV review page's static pieces, shared by the page and its loading
// skeleton (the /partners loading boundaries), so the skeleton has the page's
// exact geometry. Kept free of the page's sign-in and download code (the
// Firebase SDK, JSZip): the boundaries ship ahead of the page.

import { SkeletonRegion, SkeletonText } from '@/components/ui/skeleton';

export const PAGE =
  'bg-background min-h-screen pt-24 sm:pt-28 pb-24 transition-colors duration-300';
export const COLUMN = 'max-w-4xl mx-auto px-5 sm:px-8';
export const LEDE = 'text-muted-foreground leading-relaxed max-w-2xl';

export const CvReviewHeader = () => (
  <>
    <p className="mono-label text-muted-foreground mb-4">Partner access</p>
    <h1 className="display-lg mb-4">
      Member <span className="paren">(CVs)</span>
    </h1>
  </>
);

/** While the session and the list load: the heading and the opening paragraph
 * (the same length signed in or out). What follows depends on access, so it
 * renders below without moving anything above it. */
export const CvReviewSkeleton = () => (
  <SkeletonRegion label="Loading…" className={PAGE}>
    <div className={COLUMN}>
      <CvReviewHeader />
      <div className={LEDE}>
        {/* Two lines wide, three on a phone. */}
        <SkeletonText lines={2} widths={['100%', '100%']} />
        <SkeletonText className="sm:hidden" />
      </div>
    </div>
  </SkeletonRegion>
);
