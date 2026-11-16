'use client';

import { useTheme } from '@/providers/ThemeProvider';
import { Moon, Sun } from 'lucide-react';

export function ThemeToggle({ className = '' }: { className?: string }) {
  const { toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={`size-9 grid place-items-center rounded-full text-current/60 hover:text-current hover:bg-current/[0.06] transition-colors duration-300 cursor-pointer ${className}`}
      aria-label="Toggle theme"
    >
      {/* Both icons ship; CSS picks one so the server HTML already matches the theme. */}
      <Sun className="h-4 w-4 hidden dark:block" aria-hidden />
      <Moon className="h-4 w-4 dark:hidden" aria-hidden />
    </button>
  );
}
