import type { Metadata } from 'next';
import NewsletterPage from '@/components/pages/NewsletterPage';
import { SITE_URL } from '@/app/metadata';

const DESCRIPTION = 'Manage your UU AI Society newsletter subscription.';

export const metadata: Metadata = {
  title: 'Newsletter',
  description: DESCRIPTION,
  alternates: { canonical: `${SITE_URL}/newsletter` },
  openGraph: {
    title: 'UU AI Society Newsletter',
    description: DESCRIPTION,
    type: 'website',
    url: `${SITE_URL}/newsletter`,
    siteName: 'UU AI Society',
  },
};

type PageProps = {
  searchParams: Promise<{ subscribe?: string | string[] }>;
};

export default async function Page({ searchParams }: PageProps) {
  const { subscribe } = await searchParams;
  const requestedSubscription =
    subscribe === 'true' ? true : subscribe === 'false' ? false : null;
  return <NewsletterPage requestedSubscription={requestedSubscription} />;
}
