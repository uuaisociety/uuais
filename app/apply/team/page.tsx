import type { Metadata } from 'next';
import dynamic from 'next/dynamic';
import { TeamApplicationSkeleton } from '@/components/pages/TeamApplicationSkeleton';

export const metadata: Metadata = {
  title: 'Join Our Teams',
  description: 'Apply to join UU AI Society teams',
};

const TeamApplicationPage = dynamic(
  () => import('@/components/pages/TeamApplicationPage'),
  {
    loading: () => <TeamApplicationSkeleton label="Loading…" />,
  },
);

export default function Page() {
  return <TeamApplicationPage />;
}
