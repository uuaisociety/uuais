import type { Metadata } from 'next';
import EventsPageComponent from '@/components/pages/EventsPage';
import { ErrorBoundaryWrapper } from '@/components/ui/ErrorBoundaryWrapper';
import { SITE_URL } from '@/app/metadata';
import { AppSeed } from '@/contexts/AppContext';
import { getCachedPublicSeed } from '@/lib/server-data-cache';

export const metadata: Metadata = {
  title: 'Events',
  description:
    'Discover upcoming events, workshops, seminars, and hackathons organized by UU AI Society in Uppsala.',
  alternates: { canonical: `${SITE_URL}/events` },
};

export default async function EventsPage() {
  const { events } = await getCachedPublicSeed();
  return (
    <ErrorBoundaryWrapper>
      <AppSeed seed={{ events }}>
        <EventsPageComponent />
      </AppSeed>
    </ErrorBoundaryWrapper>
  );
}
