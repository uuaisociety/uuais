import type { Metadata } from 'next';
import PartnersPage from '@/components/pages/PartnersPage';
import { SITE_URL } from '@/app/metadata';

export const metadata: Metadata = {
  title: 'Partners',
  description:
    'The companies and organisations that partner with UU AI Society, the student society for Artificial Intelligence in Uppsala, and how to become one.',
  alternates: { canonical: `${SITE_URL}/partners` },
};

export default function Page() {
  return <PartnersPage />;
}
