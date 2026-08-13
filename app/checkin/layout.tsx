import type { Metadata } from 'next';
import { SITE_URL } from '@/app/metadata';

export const metadata: Metadata = {
  title: 'Check-in',
  description: 'Check in to UU AI Society events - validate your attendance at workshops, seminars, and meetups.',
  alternates: { canonical: `${SITE_URL}/checkin` },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
