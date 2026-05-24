import BlogPage from '@/components/pages/BlogPage';
import { ErrorBoundaryWrapper } from '@/components/ui/ErrorBoundaryWrapper';

export default function Page() {
  return (
    <ErrorBoundaryWrapper>
      <BlogPage />
    </ErrorBoundaryWrapper>
  );
}