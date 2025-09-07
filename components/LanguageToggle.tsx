'use client'

import { useTranslation } from 'react-i18next'
import { Globe } from 'lucide-react'
import '../i18n'

export function LanguageToggle() {
  const { i18n, t } = useTranslation()

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'sv' : 'en'
    i18n.changeLanguage(newLang)
  }

  return (
    <button
      onClick={toggleLanguage}
      className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center gap-2 cursor-pointer"
      aria-label={t('language.toggle')}
    >
      <Globe className="h-5 w-5" />
      <span className="text-sm font-medium">{i18n.language.toUpperCase()}</span>
    </button>
  )
}