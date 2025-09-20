import { Inter } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Providers } from './providers';
import { AppProvider } from '@/contexts/AppContext';
// import UpcomingEventsBanner from '@/components/common/UpcomingEventsBanner';

// import { metadata, viewport } from "./metadata";
export { metadata, viewport } from "./metadata";;


const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning data-scroll-behavior="smooth">
      <body className={`${inter.variable} font-sans bg-white dark:bg-gray-900 text-gray-900 dark:text-white min-h-screen transition-colors duration-300`}>
        <Providers>
          <AppProvider>
            <div className="min-h-screen flex flex-col">
              <Header />
              <main id="main" className="flex-grow">
                {children}
              </main>
              <Footer />
              {/* <UpcomingEventsBanner /> */}
            </div>
          </AppProvider>
        </Providers>
      </body>
    </html>
  );
}