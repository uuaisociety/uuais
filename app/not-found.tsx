import Link from 'next/link';
import { NotFound } from '@/components/ui/NotFound';

export default function NotFoundPage() {
  return (
    <NotFound
      title="Page not found"
      description="This page doesn't exist. It might have been moved, the link you followed might be incorrect, or the page may have been removed."
    >
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link
          href="/"
          className="px-6 py-3 bg-primary text-primary-foreground font-medium rounded-md hover:opacity-90 transition-colors"
        >
          Go Home
        </Link>
        <Link
          href="/events"
          className="px-6 py-3 border border-border text-foreground font-medium rounded-md hover:bg-foreground/[0.05] transition-colors"
        >
          Browse Events
        </Link>
      </div>
    </NotFound>
  );
}
