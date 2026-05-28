'use client'

import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import 'vanilla-cookieconsent/dist/cookieconsent.css';
import * as CookieConsent from 'vanilla-cookieconsent';

export interface CookieConsentState {
  analytics: boolean;
  necessary: boolean;
  loaded: boolean;
}

const initialState: CookieConsentState = {
  analytics: false,
  necessary: true,
  loaded: false,
};

const CookieConsentContext = createContext<CookieConsentState>(initialState);

function initCookieConsent(
  onStateChange: (state: CookieConsentState) => void,
) {
  CookieConsent.run({
    mode: 'opt-in',
    disablePageInteraction: false,
    guiOptions: {
      consentModal: {
        layout: 'box',
        position: 'bottom right',
        equalWeightButtons: false,
      },
      preferencesModal: {
        layout: 'box',
        equalWeightButtons: false,
      },
    },
    categories: {
      necessary: {
        enabled: true,
        readOnly: true,
      },
      analytics: {
        enabled: false,
      },
    },
    language: {
      default: 'en',
      translations: {
        en: {
          consentModal: {
            title: 'We use cookies',
            description:
              'We use cookies to analyse our traffic and improve your experience on our website.',
            acceptAllBtn: 'Accept all',
            acceptNecessaryBtn: 'Reject all',
            showPreferencesBtn: 'Customize',
            footer:
              '<a href="/privacy" aria-label="Privacy Policy">Privacy Policy</a>',
          },
          preferencesModal: {
            title: 'Cookie Preferences',
            acceptAllBtn: 'Accept all',
            acceptNecessaryBtn: 'Reject all',
            savePreferencesBtn: 'Save preferences',
            closeIconLabel: 'Close',
            sections: [
              {
                title: 'Strictly Necessary Cookies',
                description:
                  'These cookies are essential for the website to function properly and cannot be disabled.',
                linkedCategory: 'necessary',
                cookieTable: {
                  caption: 'Necessary cookie list',
                  headers: {
                    name: 'Cookie',
                    description: 'Description',
                    duration: 'Duration',
                  },
                  body: [
                    {
                      name: 'cc_cookie',
                      description: 'Cookie consent preferences',
                      duration: '6 months',
                    },
                    {
                      name: 'AuthToken',
                      description: 'Authentication token for logged-in users',
                      duration: 'Session',
                    },
                    {
                      name: 'sidebar_state',
                      description: 'Sidebar UI state',
                      duration: '1 week',
                    },
                  ],
                },
              },
              {
                title: 'Analytics Cookies',
                description:
                  'These cookies help us understand how visitors interact with our website, so we can improve it.',
                linkedCategory: 'analytics',
                cookieTable: {
                  caption: 'Analytics cookie list',
                  headers: {
                    name: 'Cookie',
                    description: 'Description',
                    duration: 'Duration',
                  },
                  body: [
                    {
                      name: '_vercel_analytics_*',
                      description: 'Vercel Analytics tracking',
                      duration: 'Session',
                    },
                  ],
                },
              },
            ],
          },
        },
      },
    },
    onChange: ({ cookie }) => {
      const analytics = cookie.categories.includes('analytics');
      onStateChange({ analytics, necessary: true, loaded: true });
    },
    onConsent: ({ cookie }) => {
      const analytics = cookie.categories.includes('analytics');
      onStateChange({ analytics, necessary: true, loaded: true });
    },
  });
}

export function CookieConsentProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [state, setState] = useState<CookieConsentState>(initialState);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    initCookieConsent((newState) => {
      setState(newState);
    });
  }, []);

  return (
    <CookieConsentContext.Provider value={state}>
      {children}
    </CookieConsentContext.Provider>
  );
}

export function useCookieConsent() {
  return useContext(CookieConsentContext);
}