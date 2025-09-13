'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ThemeToggle } from '@/components/ThemeToggle'
import { useState } from 'react';
import { Menu, X } from 'lucide-react';

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const scrollToSection = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    const section = document.getElementById(id);
    if (section) {
      section.scrollIntoView({ behavior: 'smooth' });
    }
    setIsMenuOpen(false); // Close mobile menu after click
  };

  return (
    <nav className="fixed top-0 w-full bg-white dark:bg-black backdrop-blur-sm z-50 border-b border-black/10 dark:border-white/10">
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
                priority
              />
              <span className="ml-2 font-bold text-xl dark:text-white text-black">UU AI Society</span>
            </Link>
          </div>
          
          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-700"
            >
              {isMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>

          {/* Desktop menu */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-center space-x-4">
              <a
                href="#events"
                onClick={(e) => scrollToSection(e, 'events')}
                className="text-black dark:text-white hover:text-[#c8102e] px-3 py-2 rounded-md text-sm font-medium"
              >
                Events
              </a>
              <Link 
                href="/application" 
                className="text-black dark:text-white hover:text-[#c8102e] px-3 py-2 rounded-md text-sm font-medium"
              >
                Application
              </Link>
              <Link href="/quiz" className="text-white hover:text-[#c8102e] px-3 py-2 rounded-md text-sm font-medium">
                Quiz
              </Link>
              <a
                href="#about"
                onClick={(e) => scrollToSection(e, 'about')}
                className="text-black dark:text-white hover:text-[#c8102e] px-3 py-2 rounded-md text-sm font-medium"
              >
                About
              </a>
              <a
                href="https://www.linkedin.com/company/uu-ai-society"
                target="_blank"
                rel="noopener noreferrer"
                className="text-black dark:text-white hover:text-[#c8102e] px-3 py-2 rounded-md text-sm font-medium"
              >
                LinkedIn
              </a>
              <ThemeToggle />
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        <div className={`md:hidden ${isMenuOpen ? 'block' : 'hidden'}`}>
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            <a
              href="#events"
              onClick={(e) => scrollToSection(e, 'events')}
              className="text-black dark:text-white hover:text-[#c8102e] block px-3 py-2 rounded-md text-base font-medium"
            >
              Events
            </a>
            <Link 
              href="/application"
              onClick={() => setIsMenuOpen(false)}
              className="text-black dark:text-white hover:text-[#c8102e] block px-3 py-2 rounded-md text-base font-medium"
            >
              Application
            </Link>
            <a
              href="#about"
              onClick={(e) => scrollToSection(e, 'about')}
              className="text-black dark:text-white hover:text-[#c8102e] block px-3 py-2 rounded-md text-base font-medium"
            >
              About
            </a>
            <a
              href="https://www.linkedin.com/company/uu-ai-society"
              target="_blank"
              rel="noopener noreferrer"
              className="text-black dark:text-white hover:text-[#c8102e] block px-3 py-2 rounded-md text-base font-medium"
            >
              LinkedIn
            </a>
            <div className="flex items-center space-x-2 px-3 py-2">
              <ThemeToggle />
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;