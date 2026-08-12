import { Instrument_Sans, Martian_Mono } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { PageTransition } from "@/components/layout/PageTransition";
import { Providers } from './providers';
import { AppProvider } from '@/contexts/AppContext';
import { getPublicSeed } from '@/lib/server-data';
import { NotificationsProvider } from '@/components/ui/Notifications';
import RegistrationGate from '@/components/auth/RegistrationGate';
import { AnalyticsWithConsent } from '@/components/common/AnalyticsWithConsent';
// import UpcomingEventsBanner from '@/components/common/UpcomingEventsBanner';

// import { metadata, viewport } from "./metadata";
export { metadata, viewport } from "./metadata";;


// Background texture layer — flip between "grain", "vignette", or "none" to compare.
const bgTexture: "grain" | "vignette" | "none" = "grain";


// Display grotesque for everything editorial; mono reserved for metadata,
// labels and tags so data reads differently from prose.
const display = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const mono = Martian_Mono({
  subsets: ["latin"],
  variable: "--font-mono-ui",
  weight: ["400", "500", "600"],
  display: "swap",
});

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const seed = await getPublicSeed();

  return (
    <html lang="en" suppressHydrationWarning data-scroll-behavior="smooth">
      <body className={`${display.variable} ${mono.variable} font-sans bg-background text-foreground min-h-screen`}>
        <link rel="preconnect" href="https://firebasestorage.googleapis.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://storage.googleapis.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://www.gstatic.com" crossOrigin="anonymous" />
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground"
        >
          Skip to content
        </a>
        <Providers>
          <NotificationsProvider>
            <AppProvider seed={seed}>
              {/* Ambient colour fields the glass surfaces refract */}
              <div className="ambient" aria-hidden />
              {bgTexture === "grain" && <div className="grain" aria-hidden />}
              {bgTexture === "vignette" && <div className="vignette" aria-hidden />}
              <div className="min-h-screen flex flex-col">
                <Header />
                <RegistrationGate />
                <main id="main" className="flex-grow min-h-screen">
                  <PageTransition>{children}</PageTransition>
                </main>
                <Footer />
                {/* <UpcomingEventsBanner /> */}
              </div>
            </AppProvider>
          </NotificationsProvider>
          <AnalyticsWithConsent />
        </Providers>
      </body>
    </html>
  );
}
