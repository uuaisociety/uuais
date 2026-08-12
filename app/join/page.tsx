import type { Metadata } from 'next';
import JoinPage from '@/components/pages/JoinPage';
import { SITE_URL } from '@/app/metadata';

export const metadata: Metadata = {
  title: 'Join',
  description: 'Join UU AI Society - free membership for students interested in Artificial Intelligence, with events, workshops, and community at Uppsala University.',
  alternates: { canonical: `${SITE_URL}/join` },
};

export default function Page() {
  return <JoinPage />;
}