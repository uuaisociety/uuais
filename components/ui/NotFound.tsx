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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <h1 className="text-6xl font-bold text-red-600 mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-3">{title}</h2>
        <p className="text-gray-600 dark:text-gray-300 mb-4 leading-relaxed">{description}</p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
          If something seems wrong, send us an email at{' '}
          <a href="mailto:it@uuais.com" className="text-red-600 hover:underline">it@uuais.com</a>
        </p>
        {children ?? (
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/"
              className="px-6 py-3 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors"
            >
              Go Home
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
