import type { Metadata } from 'next';
import { Suspense } from 'react';
import BlogPage from '@/components/pages/BlogPage';
import { ErrorBoundaryWrapper } from '@/components/ui/ErrorBoundaryWrapper';

export const metadata: Metadata = {
  title: 'Blog',
  description: 'News and insights from the UU AI Society — editorials from our team and AI-generated digests from the AI News Desk.',
  alternates: {
    canonical: '/blog',
    types: {
      'application/rss+xml': '/blog/rss.xml',
    },
  },
  openGraph: {
    title: 'Blog | UU AI Society',
    description: 'News and insights from the UU AI Society — editorials from our team and AI-generated digests from the AI News Desk.',
    type: 'website',
    url: '/blog',
    siteName: 'UU AI Society',
  },
};

export default function Page() {
  return (
    <ErrorBoundaryWrapper>
      <Suspense>
        <BlogPage />
      </Suspense>
    </ErrorBoundaryWrapper>
  );
}
