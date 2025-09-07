'use client'

import { useTheme } from '@/providers/ThemeProvider'
import { useTranslation } from 'react-i18next'
import { Moon, Sun } from 'lucide-react'
import '../i18n'

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const { t } = useTranslation()

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
      aria-label={t('theme.toggle')}
    >
      {theme === 'dark' ? (
        <Sun className="h-5 w-5" />
      ) : (
        <Moon className="h-5 w-5" />
      )}
    </button>
  )
}