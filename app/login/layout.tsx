import type { Metadata } from 'next';
import { SITE_URL } from '@/app/metadata';

export const metadata: Metadata = {
  title: 'Login',
  description: 'Sign in to your UU AI Society member account to access events, courses, and community features.',
  alternates: { canonical: `${SITE_URL}/login` },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
