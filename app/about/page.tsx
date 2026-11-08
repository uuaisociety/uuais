import type { Metadata } from 'next';
import AboutPage from '@/components/pages/AboutPage';
import { SITE_URL } from '@/app/metadata';
import { AppSeed } from '@/contexts/AppContext';
import { getCachedPublicSeed } from '@/lib/server-data-cache';

export const metadata: Metadata = {
  title: 'About',
  description:
    'Learn about UU AI Society - the student society for Artificial Intelligence in Uppsala: our mission, team, community, and how to contact us.',
  alternates: { canonical: `${SITE_URL}/about` },
};

export default async function Page() {
  const { faqs } = await getCachedPublicSeed();
  return (
    <AppSeed seed={{ faqs }}>
      <AboutPage />
    </AppSeed>
  );
}
