'use client';

import { usePathname } from 'next/navigation';
import { ShowcaseSkeleton } from '@/components/pages/ShowcasePage';
import ProjectLoading from './[id]/loading';

// Shown straight away: it is the page's own frame, so nothing pops in or out.
// A navigation prefetches only down to the first loading boundary, which is this
// one for every /showcase/* route, so it stands in for a project page too.
export default function Loading() {
  return usePathname() === '/showcase' ? (
    <ShowcaseSkeleton />
  ) : (
    <ProjectLoading />
  );
}
