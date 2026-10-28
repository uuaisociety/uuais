import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import PartnersPage from '@/components/pages/PartnersPage';
import { SITE_URL } from '@/app/metadata';
import { PARTNERS_PAGE_PUBLIC } from '@/lib/feature-flags';

export const metadata: Metadata = {
  title: 'Partners',
  description:
    'The companies and organisations that partner with UU AI Society, the student society for Artificial Intelligence in Uppsala, and how to become one.',
  alternates: { canonical: `${SITE_URL}/partners` },
};

export default function Page() {
  // Hidden until launch (see lib/feature-flags); /partners/cvs stays available.
  if (!PARTNERS_PAGE_PUBLIC) notFound();
  return <PartnersPage />;
}
