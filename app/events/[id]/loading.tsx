import { EventDetailSkeleton } from '@/components/events/EventDetailLayout';

// Shown straight away: it is the page's own frame, so there is nothing to pop.
export default function Loading() {
  return <EventDetailSkeleton />;
}
