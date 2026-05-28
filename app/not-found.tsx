import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <h1 className="text-6xl font-bold text-red-600 mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-3">
          Page not found
        </h2>
        <p className="text-gray-600 dark:text-gray-300 mb-4 leading-relaxed">
          This page doesn&apos;t exist. It might have been moved, the link you
          followed might be incorrect, or the page may have been removed.
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
          If something seems wrong, send us an email at{' '}
          <a href="mailto:dev@uuais.com" className="text-red-600 hover:underline">dev@uuais.com</a>
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="px-6 py-3 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors"
          >
            Go Home
          </Link>
          <Link
            href="/events"
            className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            Browse Events
          </Link>
        </div>
      </div>
    </div>
  );
}
