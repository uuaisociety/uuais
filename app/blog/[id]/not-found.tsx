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
          className="px-6 py-3 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors"
        >
          Back to Blog
        </Link>
        <Link
          href="/"
          className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          Go Home
        </Link>
      </div>
    </NotFound>
  );
}
