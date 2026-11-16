'use client';

import { createContext, useContext, useState } from 'react';
import { useIsomorphicLayoutEffect } from '@/hooks/use-isomorphic-layout-effect';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'dark';
  // The pre-paint script in <head> has already put the theme on <html>.
  const root = document.documentElement;
  if (root.classList.contains('light')) return 'light';
  if (root.classList.contains('dark')) return 'dark';
  try {
    const saved = window.localStorage.getItem('theme');
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    /* storage blocked — fall back to the system preference */
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

function applyTheme(theme: Theme) {
  document.documentElement.classList.remove('light', 'dark');
  document.documentElement.classList.add(theme);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Read straight from <html> on the client. Nothing renders markup from this
  // value (HeroSplash and ThemeToggle style themselves with `dark:`), so the
  // server's 'dark' default never causes a hydration mismatch or a re-theme.
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  // Only does work when the pre-paint script could not run (e.g. tests).
  useIsomorphicLayoutEffect(() => {
    if (!document.documentElement.classList.contains(theme)) applyTheme(theme);
  }, []);

  const toggleTheme = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    const root = document.documentElement;
    root.setAttribute('data-theme-switching', '');
    applyTheme(next);
    try {
      window.localStorage.setItem('theme', next);
    } catch {
      /* storage blocked — the choice lasts for this page view */
    }
    setTheme(next);
    // Two frames: one for React to re-render, one for the browser to paint it.
    requestAnimationFrame(() =>
      requestAnimationFrame(() => root.removeAttribute('data-theme-switching')),
    );
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
