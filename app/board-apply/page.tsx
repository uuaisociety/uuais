'use client'

import BoardApplicationPage from '@/components/pages/BoardApplicationPage';
import AdminGate from '@/components/auth/AdminGate';
import { ErrorBoundaryWrapper } from '@/components/ui/ErrorBoundaryWrapper';

export default function Page() {
  return (
    <ErrorBoundaryWrapper>
      <AdminGate>
        <BoardApplicationPage />
      </AdminGate>
    </ErrorBoundaryWrapper>
  );
}
