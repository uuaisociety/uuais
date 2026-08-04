import ShowcaseDetailPage from '@/components/pages/ShowcaseDetailPage';
import { ErrorBoundaryWrapper } from '@/components/ui/ErrorBoundaryWrapper';

export default function Page() {
  return (
    <ErrorBoundaryWrapper>
      <ShowcaseDetailPage />
    </ErrorBoundaryWrapper>
  );
}
