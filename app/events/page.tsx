import type { Metadata } from 'next';
import EventsPageComponent from '@/components/pages/EventsPage';
import { ErrorBoundaryWrapper } from '@/components/ui/ErrorBoundaryWrapper';
import { SITE_URL } from '@/app/metadata';

export const metadata: Metadata = {
  title: 'Events',
  description: 'Discover upcoming events, workshops, seminars, and hackathons organized by UU AI Society at Uppsala University.',
  alternates: { canonical: `${SITE_URL}/events` },
};

export default function EventsPage() {
  return (
    <ErrorBoundaryWrapper>
      <EventsPageComponent />
    </ErrorBoundaryWrapper>
  );
}