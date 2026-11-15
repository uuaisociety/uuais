import HomePage from '@/components/pages/HomePage';
import { AppSeed } from '@/contexts/AppContext';
import { getCachedPublicSeed } from '@/lib/server-data-cache';

export default async function Home() {
  const { events } = await getCachedPublicSeed();
  return (
    <AppSeed seed={{ events }}>
      <HomePage />
    </AppSeed>
  );
}
