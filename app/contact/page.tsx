import type { Metadata } from 'next';
import ContactPage from '@/components/pages/ContactPage';
import { SITE_URL } from '@/app/metadata';

export const metadata: Metadata = {
  title: 'Contact',
  description: 'Contact UU AI Society - reach out with questions, partnership ideas, or interest in joining our AI community at Uppsala University.',
  alternates: { canonical: `${SITE_URL}/contact` },
};

export default function Page() {
  return <ContactPage />;
}