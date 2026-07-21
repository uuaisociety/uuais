"use client"

import { useEffect } from 'react';
import TeamApplicationPage from '@/components/pages/TeamApplicationPage';
import { ErrorBoundaryWrapper } from '@/components/ui/ErrorBoundaryWrapper';
import { updatePageMeta } from '@/utils/seo';

export default function Page() {
  useEffect(() => {
    updatePageMeta('Join Our Teams', 'Apply to join UU AI Society teams');
  }, []);
  return (
    <ErrorBoundaryWrapper>
      <TeamApplicationPage />
    </ErrorBoundaryWrapper>
  );
}
