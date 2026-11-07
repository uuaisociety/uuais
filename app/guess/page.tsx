import type { Metadata } from 'next';
import GuessPage from '@/components/pages/GuessPage';

export const metadata: Metadata = {
  title: 'Guess the amount',
  description: 'The UU AI Society guessing game.',
  robots: { index: false },
};

export default function Page() {
  return <GuessPage />;
}
