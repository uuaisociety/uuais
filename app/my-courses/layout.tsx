import type { Metadata } from 'next';
import { SITE_URL } from '@/app/metadata';

export const metadata: Metadata = {
  title: 'My Courses',
  description: 'Manage and track your selected AI courses and study plan on UU AI Society.',
  alternates: { canonical: `${SITE_URL}/my-courses` },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
