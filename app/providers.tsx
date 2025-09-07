'use client'

import { ThemeProvider } from '@/providers/ThemeProvider'
import { LanguageProvider } from '@/providers/LanguageProvider'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <LanguageProvider>
        {children}
      </LanguageProvider>
    </ThemeProvider>
  )
}
