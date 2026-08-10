import { Instrument_Sans, Martian_Mono } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Providers } from './providers';
import { AppProvider } from '@/contexts/AppContext';
import { NotificationsProvider } from '@/components/ui/Notifications';
import RegistrationGate from '@/components/auth/RegistrationGate';
import { AnalyticsWithConsent } from '@/components/common/AnalyticsWithConsent';
// import UpcomingEventsBanner from '@/components/common/UpcomingEventsBanner';

// import { metadata, viewport } from "./metadata";
export { metadata, viewport } from "./metadata";;


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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning data-scroll-behavior="smooth">
      <body className={`${display.variable} ${mono.variable} font-sans bg-background text-foreground min-h-screen`}>
        <Providers>
          <NotificationsProvider>
            <AppProvider>
              {/* Ambient colour fields the glass surfaces refract */}
              <div className="ambient" aria-hidden />
              <div className="min-h-screen flex flex-col">
                <Header />
                <RegistrationGate />
                <main id="main" className="flex-grow">
                  {children}
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
