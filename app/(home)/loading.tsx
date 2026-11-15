import { HomeSkeleton } from '@/components/pages/HomeLayout';

// Shown straight away: it is the page's own frame, so nothing jumps when the
// content arrives. Kept in the (home) group so only / ships it, not every route.
export default function Loading() {
  return <HomeSkeleton />;
}
