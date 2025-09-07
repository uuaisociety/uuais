'use client'

import { createContext, useContext, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import '../i18n/client'

type Language = 'en' | 'sv'

interface LanguageContextType {
  language: Language
  toggleLanguage: () => void
  t: (key: string, options?: Record<string, unknown>) => string
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const { i18n, t } = useTranslation()
  const language = i18n.language as Language

  useEffect(() => {
    const savedLanguage = localStorage.getItem('i18nextLng')
    if (savedLanguage && (savedLanguage === 'en' || savedLanguage === 'sv')) {
      i18n.changeLanguage(savedLanguage)
    }
  }, [i18n])

  const toggleLanguage = () => {
    const newLang = language === 'en' ? 'sv' : 'en'
    i18n.changeLanguage(newLang)
  }

  // Wait for i18next to be initialized
  if (!i18n.isInitialized) {
    return null
  }

  return (
    <LanguageContext.Provider value={{ language, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export const useLanguage = () => {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}