'use client';

import Image from 'next/image';
import Link from 'next/link';

const Navbar = () => {
  const scrollToSection = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    const section = document.getElementById(id);
    if (section) {
      section.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <nav className="fixed top-0 w-full bg-black/80 backdrop-blur-sm z-50 border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex-shrink-0">
            <Link href="/" className="flex items-center">
              <Image
                src="/images/logo.png"
                alt="UU AI Society Logo"
                width={40}
                height={40}
                className="h-8 w-auto"
              />
              <span className="ml-2 text-white font-bold text-xl">UU AI Society</span>
            </Link>
          </div>
          
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-4">
              <a
                href="#events"
                onClick={(e) => scrollToSection(e, 'events')}
                className="text-white hover:text-[#c8102e] px-3 py-2 rounded-md text-sm font-medium"
              >
                Events
              </a>
              <Link href="/application" className="text-white hover:text-[#c8102e] px-3 py-2 rounded-md text-sm font-medium">
                Application
              </Link>
              <Link href="/quiz" className="text-white hover:text-[#c8102e] px-3 py-2 rounded-md text-sm font-medium">
                Quiz
              </Link>
              <a
                href="#about"
                onClick={(e) => scrollToSection(e, 'about')}
                className="text-white hover:text-[#c8102e] px-3 py-2 rounded-md text-sm font-medium"
              >
                About
              </a>
              <a
                href="https://www.linkedin.com/company/uu-ai-society"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white hover:text-[#c8102e] px-3 py-2 rounded-md text-sm font-medium"
              >
                LinkedIn
              </a>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar; 