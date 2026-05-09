'use client'

import { ThemeProvider } from '@/providers/ThemeProvider'
import { CookieConsentProvider } from '@/contexts/CookieConsentContext'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <CookieConsentProvider>
        {children}
      </CookieConsentProvider>
    </ThemeProvider>
  )
}