import { ShowcaseDetailSkeleton } from '@/components/showcase/ShowcaseDetailLayout';

// Shown straight away: it is the project page's own frame, and the page's own
// loading state while projects stream in.
export default function Loading() {
  return <ShowcaseDetailSkeleton />;
}
