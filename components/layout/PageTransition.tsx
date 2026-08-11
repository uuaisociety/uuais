'use client'

import { usePathname } from 'next/navigation';
import { useState } from 'react';

/**
 * Fades the page content in on every route change so navigation reads as one
 * continuous surface (the fixed header, footer and ambient field stay put).
 * Keyed on pathname so the animation re-runs on mount; the initial page load
 * is not animated — only navigations.
 */
export const PageTransition: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname();
  const [prevPathname, setPrevPathname] = useState(pathname);
  const [hasNavigated, setHasNavigated] = useState(false);

  // Adjust state when the pathname changes during render, so a fresh load is
  // told apart from a navigation without an effect.
  if (prevPathname !== pathname) {
    setHasNavigated(true);
    setPrevPathname(pathname);
  }

  return (
    <div key={pathname} className={hasNavigated ? 'animate-page-in' : undefined}>
      {children}
    </div>
  );
};
