import type { Metadata } from 'next';
import { Suspense } from 'react';
import ShowcasePage from '@/components/pages/ShowcasePage';
import { ErrorBoundaryWrapper } from '@/components/ui/ErrorBoundaryWrapper';
import { SITE_URL } from '@/app/metadata';

const DESCRIPTION =
  'AI projects built by UU AI Society members — from weekend hackathon builds to ongoing research prototypes.';

export const metadata: Metadata = {
  title: 'Showcase',
  description: DESCRIPTION,
  alternates: { canonical: `${SITE_URL}/showcase` },
  openGraph: {
    title: 'Member Showcase',
    description: DESCRIPTION,
    type: 'website',
    url: `${SITE_URL}/showcase`,
    siteName: 'UU AI Society',
    images: [{ url: '/images/logo-highdef.png', width: 1200, height: 630, alt: 'UU AI Society' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Member Showcase',
    description: DESCRIPTION,
    images: ['/images/logo-highdef.png'],
  },
};

export default function Page() {
  return (
    <ErrorBoundaryWrapper>
      <Suspense>
        <ShowcasePage />
      </Suspense>
    </ErrorBoundaryWrapper>
  );
}
