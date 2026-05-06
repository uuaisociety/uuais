'use client'

import { useTheme } from '@/providers/ThemeProvider'
import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export function ThemeToggle({ className = '', isHomePage = false }: { className?: string, isHomePage?: boolean }) {
  const { theme, toggleTheme } = useTheme()

  return (
    <Button
      onClick={toggleTheme}
      className={`p-2 rounded-md transition-colors cursor-pointer shadow-none ${
        isHomePage
          ? 'bg-transparent hover:bg-white/10 dark:hover:bg-transparent !border-0'
          : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
      } ${className}`}
      aria-label="Toggle theme"
    >
      {theme === 'dark' ? (
        <Sun className="h-5 w-5 text-white" />
      ) : (
        <Moon className={`h-5 w-5 ${isHomePage ? 'text-white' : 'text-black'}`} />
      )}
    </Button>
  )
}