import Link from 'next/link';
import { NotFound } from '@/components/ui/NotFound';

export default function BlogNotFound() {
  return (
    <NotFound
      title="Article not found"
      description="This article could not be found. It may have been unpublished, moved, or the link you followed may be incorrect."
    >
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link
          href="/blog"
          className="px-6 py-3 bg-primary text-primary-foreground font-medium rounded-md hover:opacity-90 transition-colors"
        >
          Back to Blog
        </Link>
        <Link
          href="/"
          className="px-6 py-3 border border-border text-foreground font-medium rounded-md hover:bg-foreground/[0.05] transition-colors"
        >
          Go Home
        </Link>
      </div>
    </NotFound>
  );
}
