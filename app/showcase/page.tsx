import ShowcasePage from '@/components/pages/ShowcasePage';
import { ErrorBoundaryWrapper } from '@/components/ui/ErrorBoundaryWrapper';

export default function Page() {
  return (
    <ErrorBoundaryWrapper>
      <ShowcasePage />
    </ErrorBoundaryWrapper>
  );
}
