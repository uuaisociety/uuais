import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { SkeletonRegion, SkeletonText } from '@/components/ui/skeleton';

// Shared by the course detail page (/explore/[id]) and its loading skeleton, so
// the skeleton has the page's exact geometry. No "use client": the server page
// reads these classes too.

export const COURSE_PAGE_CLASS =
  'min-h-screen bg-gray-50 dark:bg-gray-900 pt-24 pb-12 transition-colors duration-300';
export const COURSE_CONTAINER_CLASS = 'max-w-4xl mx-auto px-4 sm:px-6 lg:px-8';
export const COURSE_PANEL_CLASS =
  'bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700';
export const COURSE_HEADER_CLASS =
  'flex flex-wrap items-center justify-between gap-3';
export const COURSE_FACT_CLASS =
  'rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 p-4';

/** The connections graph's frame and height; its loading placeholder takes the same box. */
export const CONNECTIONS_HEIGHT = 520;
export const CONNECTIONS_FRAME_CLASS =
  'border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-900 relative';

export const ConnectionsSkeleton = () => (
  <SkeletonRegion label="Loading connections…" className="w-full">
    <div className={CONNECTIONS_FRAME_CLASS}>
      <div
        className="animate-pulse bg-current/[0.04]"
        style={{ height: CONNECTIONS_HEIGHT }}
      />
    </div>
  </SkeletonRegion>
);

/**
 * A course page while it loads: the back button, the title panel and the
 * overview with its facts grid. The back button's label is the plain one; the
 * programme name it may carry isn't known yet.
 */
export const CourseDetailSkeleton = () => (
  <SkeletonRegion label="Loading course…" className={COURSE_PAGE_CLASS}>
    <div inert className={COURSE_CONTAINER_CLASS}>
      <span>
        <Button variant="outline" className="mb-8" icon={ArrowLeft}>
          Back to Courses
        </Button>
      </span>
      <div className="space-y-6">
        <div className={COURSE_PANEL_CLASS}>
          <div className={COURSE_HEADER_CLASS}>
            {/* Sized like a real title: it fills a phone's row, so the slot below wraps as it does on the page. */}
            <div className="w-full sm:w-3/4">
              <SkeletonText className="text-sm" widths={['5rem']} />
              {/* "Title - code" usually wraps to two lines on a phone. */}
              <SkeletonText
                className="text-3xl font-bold sm:hidden"
                lines={2}
                widths={['100%', '50%']}
              />
              <SkeletonText
                className="text-3xl font-bold hidden sm:block"
                widths={['70%']}
              />
              <span className="block mt-1 text-sm text-blue-500 dark:text-blue-400">
                View uu.se course page
              </span>
            </div>
            {/* The favourite button's slot: empty until auth resolves, but on a phone it still wraps onto its own row. */}
            <div className="flex items-center gap-3" />
          </div>
        </div>
        <div className={COURSE_PANEL_CLASS}>
          <h2 className="text-xl font-semibold mb-3">Overview</h2>
          <SkeletonText className="mb-6" lines={3} />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-6">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className={COURSE_FACT_CLASS}>
                <SkeletonText
                  className="text-xs font-medium uppercase tracking-wide"
                  widths={['40%']}
                />
                <SkeletonText className="mt-1 text-sm" widths={['70%']} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </SkeletonRegion>
);
