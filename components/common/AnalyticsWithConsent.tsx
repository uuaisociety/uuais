'use client'

import { Analytics } from "@vercel/analytics/next"
import { useCookieConsent } from '@/contexts/CookieConsentContext'

export function AnalyticsWithConsent() {
  const { analytics, loaded } = useCookieConsent()

  if (!loaded) return null
  if (!analytics) return null

  return <Analytics />
}