'use client'

import { useEffect } from 'react';
import BoardApplicationPage from '@/components/pages/BoardApplicationPage';
import AdminGate from '@/components/auth/AdminGate';
import { ErrorBoundaryWrapper } from '@/components/ui/ErrorBoundaryWrapper';
import { updatePageMeta } from '@/utils/seo';

export default function Page() {
  useEffect(() => {
    updatePageMeta('Board Application', 'Apply for the UU AI Society board');
  }, []);
  return (
    <ErrorBoundaryWrapper>
      <AdminGate>
        <BoardApplicationPage />
      </AdminGate>
    </ErrorBoundaryWrapper>
  );
}
