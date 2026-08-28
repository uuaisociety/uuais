import Link from 'next/link';
import { NotFound } from '@/components/ui/NotFound';

export default function ShowcaseNotFound() {
  return (
    <NotFound
      title="Project not found"
      description="This project could not be found. It may have been unpublished, moved, or the link you followed may be incorrect."
    >
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link
          href="/showcase"
          className="px-6 py-3 bg-primary text-primary-foreground font-medium rounded-md hover:opacity-90 transition-colors"
        >
          Back to Showcase
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
