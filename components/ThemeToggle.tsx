'use client'

import { useTheme } from '@/providers/ThemeProvider'
import { Moon, Sun } from 'lucide-react'
import { Button } from './ui/Button'

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()

  return (
    <Button
      onClick={toggleTheme}
      className="p-2 rounded-md bg-white dark:bg-black hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
      aria-label="Toggle theme"
    >
      {theme === 'dark' ? (
        <Sun className="h-5 w-5 text-white" />
      ) : (
        <Moon className="h-5 w-5 text-black" />
      )}
    </Button>
  )
}