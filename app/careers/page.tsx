import CareersPage from '@/components/pages/CareersPage';
import { ErrorBoundaryWrapper } from '@/components/ui/ErrorBoundaryWrapper';

export const metadata = {
  title: 'Job board',
  description: 'Job board for startups, internships, master thesis, and jobs.'
};

export default function Page() {
  return (
    <ErrorBoundaryWrapper>
      <CareersPage />
    </ErrorBoundaryWrapper>
  );
}
