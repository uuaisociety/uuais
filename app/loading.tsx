'use client'

import { useEffect, useState } from 'react';

/**
 * Route-level loading skeleton. Debounced: it renders nothing for the first
 * ~150ms so fast navigations never flash a skeleton that pops in and out —
 * the page content simply fades in (see PageTransition). For genuinely slow
 * loads it appears with an on-brand card skeleton.
 */
export default function Loading() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 150);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-14 animate-page-in" role="status" aria-label="Loading">
      <div className="max-w-7xl mx-auto">
        <div className="h-3 w-28 rounded-sm bg-foreground/10 animate-pulse" />
        <div className="mt-3 h-11 w-64 rounded-sm bg-foreground/10 animate-pulse" />
        <div className="mt-4 h-4 w-full max-w-md rounded-sm bg-foreground/5 animate-pulse" />
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="glass rounded-md overflow-hidden">
              <div className="aspect-[16/10] bg-foreground/5 animate-pulse" />
              <div className="p-5 space-y-3">
                <div className="h-4 w-3/4 rounded bg-foreground/10 animate-pulse" />
                <div className="h-3 w-full rounded bg-foreground/5 animate-pulse" />
                <div className="h-3 w-2/3 rounded bg-foreground/5 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
