import { BlogDetailSkeleton } from '@/components/blog/BlogDetailLayout';

// Shown straight away: it is the article's own frame, and the page's own loading
// state while posts stream in.
export default function Loading() {
  return <BlogDetailSkeleton />;
}
