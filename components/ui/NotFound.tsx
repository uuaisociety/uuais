import Link from 'next/link';
import type { ReactNode } from 'react';

interface NotFoundProps {
  title: string;
  description: string;
  /** Action buttons (e.g. "Back to Blog", "Browse Events"). Defaults to a single Go Home button. */
  children?: ReactNode;
}

export function NotFound({ title, description, children }: NotFoundProps) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <h1 className="text-6xl font-bold text-primary mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-foreground mb-3">{title}</h2>
        <p className="text-muted-foreground mb-4 leading-relaxed">{description}</p>
        <p className="text-sm text-muted-foreground mb-8">
          If something seems wrong, send us an email at{' '}
          <a href="mailto:it@uuais.com" className="text-primary hover:underline">it@uuais.com</a>
        </p>
        {children ?? (
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/"
              className="px-6 py-3 bg-primary text-primary-foreground font-medium rounded-md hover:opacity-90 transition-colors"
            >
              Go Home
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
