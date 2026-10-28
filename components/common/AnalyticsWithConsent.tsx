'use client';

import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { useCookieConsent } from '@/contexts/CookieConsentContext';

// A partner who opens their sign-in link on another device keeps its one-time
// code (oobCode) in the URL while confirming their email; never report it.
const SECRET_PARAMS = ['oobCode', 'apiKey', 'mode', 'continueUrl', 'lang'];

function withoutSecrets<T extends { url: string }>(event: T): T {
  try {
    const url = new URL(event.url);
    let changed = false;
    for (const p of SECRET_PARAMS) {
      if (url.searchParams.has(p)) {
        url.searchParams.delete(p);
        changed = true;
      }
    }
    return changed ? { ...event, url: url.toString() } : event;
  } catch {
    return event;
  }
}

export function AnalyticsWithConsent() {
  const { analytics, loaded } = useCookieConsent();

  if (!loaded) return null;
  if (!analytics) return null;

  return (
    <>
      <Analytics beforeSend={withoutSecrets} />
      <SpeedInsights beforeSend={withoutSecrets} />
    </>
  );
}
