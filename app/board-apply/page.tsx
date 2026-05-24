import BoardApplicationPage from '@/components/pages/BoardApplicationPage';
import { ErrorBoundaryWrapper } from '@/components/ui/ErrorBoundaryWrapper';

export const metadata = {
  title: 'Apply for Board Position',
  description: 'Internal board/committee position application form.'
};

export default function Page() {
  return (
    <ErrorBoundaryWrapper>
      <BoardApplicationPage />
    </ErrorBoundaryWrapper>
  );
}
