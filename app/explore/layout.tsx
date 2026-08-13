import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Explore',
  description: 'Explore AI courses and course recommendations available to students at Uppsala University.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
