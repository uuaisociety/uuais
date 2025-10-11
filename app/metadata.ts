import type { Metadata, Viewport } from "next";

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#c8102e',
}

export const metadata: Metadata = {
  title: {
    default: 'UU AI Society',
    template: '%s | UU AI Society'
  },
  description: 'UU AI Society - Connecting students passionate about Artificial Intelligence in Uppsala',
  keywords: [
    'AI',
    'Artificial Intelligence',
    'Uppsala University',
    'Student Society',
    'Tech Events',
    'UU',
    'UU AI Society',
    'uuais',
    'uuais.com',
    'uuais.se',
    'uuais.org',
    'Artificiell Intelligens',
    'Hackathon',
    'Workshop',
    'Seminar',
    'Lunchföreläsning',
  ],
  authors: [{ name: 'UU AI Society' }],
  creator: 'UU AI Society',
  publisher: 'UU AI Society',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  icons: {
    icon: '/images/favicon-96x96.png',
    shortcut: '/images/favicon-96x96.png',
    apple: '/images/apple-touch-icon.png',
    other: [
      {
        rel: 'apple-touch-icon-precomposed',
        url: '/images/apple-touch-icon.png',
      }
    ],
  },
  manifest: '/site.webmanifest',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  applicationName: 'UU AI Society',
  other: {
    'msapplication-TileColor': '#c8102e',
  }
}
