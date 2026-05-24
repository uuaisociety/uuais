import EventsPageComponent from '@/components/pages/EventsPage';
import { ErrorBoundaryWrapper } from '@/components/ui/ErrorBoundaryWrapper';

export default function EventsPage() {
  return (
    <ErrorBoundaryWrapper>
      <EventsPageComponent />
    </ErrorBoundaryWrapper>
  );
}