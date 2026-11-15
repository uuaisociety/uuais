import { TeamApplicationSkeleton } from '@/components/pages/TeamApplicationSkeleton';

// Shown straight away: the campaign hero and overview step, which the page shows first.
export default function Loading() {
  return <TeamApplicationSkeleton label="Loading…" />;
}
