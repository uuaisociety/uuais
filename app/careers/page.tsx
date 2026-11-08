import CareersPage from '@/components/pages/CareersPage';
import { ErrorBoundaryWrapper } from '@/components/ui/ErrorBoundaryWrapper';
import { AppSeed } from '@/contexts/AppContext';
import { getCachedPublicSeed } from '@/lib/server-data-cache';

export const metadata = {
  title: 'Job board',
  description: 'Job board for startups, internships, master thesis, and jobs.',
};

export default async function Page() {
  const { jobs } = await getCachedPublicSeed();
  return (
    <ErrorBoundaryWrapper>
      <AppSeed seed={{ jobs }}>
        <CareersPage />
      </AppSeed>
    </ErrorBoundaryWrapper>
  );
}
