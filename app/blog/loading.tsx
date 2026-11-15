'use client';

import { usePathname } from 'next/navigation';
import { BlogSkeleton } from '@/components/pages/BlogPage';
import PostLoading from './[id]/loading';

// Shown straight away: it is the page's own frame (and the page's own loading
// state while posts stream in), so nothing pops in or out. A navigation
// prefetches only down to the first loading boundary, which is this one for
// every /blog/* route, so it stands in for an article too.
export default function Loading() {
  return usePathname() === '/blog' ? <BlogSkeleton /> : <PostLoading />;
}
