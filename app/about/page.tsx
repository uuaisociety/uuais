import type { Metadata } from 'next';
import AboutPage from '@/components/pages/AboutPage';
import { SITE_URL } from '@/app/metadata';

export const metadata: Metadata = {
  title: 'About',
  description: 'Learn about UU AI Society - the student society for Artificial Intelligence in Uppsala, our mission, team, and community.',
  alternates: { canonical: `${SITE_URL}/about` },
};

export default function Page() {
  return <AboutPage />;
}