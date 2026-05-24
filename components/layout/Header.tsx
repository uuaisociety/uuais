'use client'

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { useAdmin } from '@/hooks/useAdmin';
import { useEffect, useState, useRef } from 'react';
import { getUserProfile, type UserProfile } from '@/lib/firestore/users';

export const Header: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProjectsOpen, setIsProjectsOpen] = useState(false);
  const projectsRef = useRef<HTMLDivElement>(null);
  const mobileProjectsRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const mobileButtonRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();
  const { user, isAdmin, loading, logout } = useAdmin();
  const [profile, setProfile] = useState<UserProfile | null>(null);

  const isHomePage = pathname === '/';

  // Helper function to get nav/link classes based on state
  const getNavClass = (isActive: boolean) => {
    if (isHomePage) {
      return isActive 
        ? 'bg-white/20 text-white' 
        : 'text-white/90 hover:text-white hover:bg-white/20';
    }
    return isActive 
      ? 'bg-red-600/20 text-gray-900 dark:text-white' 
      : 'text-gray-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-600/20';
  };

  // Helper function for mobile menu button classes
  const getMobileButtonClass = () => {
    if (isHomePage) {
      return 'text-white/90';
    }
    return 'text-gray-700 dark:text-gray-300';
  };

  // Helper functions for header styling
  const getHeaderBgClass = () => {
    return isHomePage 
      ? 'bg-transparent border-none shadow-none' 
      : 'bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 shadow-sm';
  };

  const getHeaderTopBarBgClass = () => {
    return isHomePage ? 'bg-transparent' : 'bg-gray-100 dark:bg-gray-800';
  };

  const getHeaderTopBarTextClass = () => {
    return isHomePage ? 'text-white/90' : 'text-gray-700 dark:text-gray-300';
  };

  const getHeaderNavBgClass = () => {
    return isHomePage 
      ? 'bg-transparent border-none shadow-none' 
      : 'bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 shadow-sm backdrop-blur-sm';
  };

  const getLogoJustifyClass = () => {
    return isHomePage ? 'justify-end' : 'justify-between';
  };

  const getMobileNavClass = () => {
    return isHomePage ? 'bg-black/20 backdrop-blur-lg rounded-b-xl' : 'bg-white dark:bg-gray-900';
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!user) {
        if (mounted) setProfile(null);
        return;
      }
      try {
        const p = await getUserProfile(user.uid);
        if (mounted) setProfile(p);
      } catch {
        if (mounted) setProfile(null);
      }
    })();
    return () => { mounted = false; };
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const isInsideDesktop = projectsRef.current?.contains(target) ?? false;
      const isInsideMobile = mobileProjectsRef.current?.contains(target) ?? false;
      if (!isInsideDesktop && !isInsideMobile) {
        setIsProjectsOpen(false);
      }
    };

    if (isProjectsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isProjectsOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!isMenuOpen) return;
      const target = event.target as Node;
      const isButton = mobileButtonRef.current?.contains(target) ?? false;
      const isMenu = mobileMenuRef.current?.contains(target) ?? false;
      if (!isButton && !isMenu) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!isMenuOpen) return;
      const target = event.target as Node;
      const isButton = mobileButtonRef.current?.contains(target) ?? false;
      const isMenu = mobileMenuRef.current?.contains(target) ?? false;
      if (!isButton && !isMenu) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  const navigation = [
    { name: 'Home', href: '/' },
    { name: 'Events', href: '/events' },
    { name: 'Job board', href: '/careers' },
    { name: 'About', href: '/about' },
    { name: 'Contact', href: '/contact' }
  ];
  const isActive = (path: string) => {
    return pathname === path;
  };

  return (
    <>
      <header
        className={`fixed top-0 w-full z-50 transition-all duration-300 ${getHeaderBgClass()}`}
      >
        {/* Top auth bar */}
        <div className={`w-full text-sm ${getHeaderTopBarBgClass()}`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-end h-9">
            <div className={`flex items-center gap-3 ${getHeaderTopBarTextClass()}`}>
              {!loading && !user && (
                <>
                  <Link href="/join" className={`${isHomePage ? 'text-white/90 hover:text-white' : 'text-gray-700 dark:text-gray-300'}`}>Register</Link>
                  <Link href="/login" className={`${isHomePage ? 'text-white/90 hover:text-white' : 'text-gray-700 dark:text-gray-300'}`}>Login</Link>
                </>
              )}
              {!loading && user && (
                <>
                  <span className="truncate max-w-[200px]">{profile?.displayName || profile?.name || user.displayName || (user as unknown as { name?: string }).name || user.email}</span>
                  <Link href="/account" className={`${isHomePage ? 'text-white/90 hover:text-white' : 'text-gray-700 dark:text-gray-300'}`}>Account</Link>
                  <a onClick={() => logout()} className={`${isHomePage ? 'text-white/90 hover:text-white' : 'text-gray-700 dark:text-gray-300'} no-underline hover:underline cursor-pointer`}>Logout</a>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Main nav bar */}
        <div className={`transition-colors duration-300 ${getHeaderNavBgClass()}`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className={`flex ${getLogoJustifyClass()} items-center h-16`}>
              {/* Logo - hidden on homepage */}
              {!isHomePage && (
                <Link href="/" className="flex items-center space-x-2 group no-underline">
                  <div className="pl-2 pb-2 rounded-lg">
                    <Image
                      src="/images/logo-highdef.png"
                      alt="UU AI Society Logo"
                      width={240}
                      height={40}
                      className="h-12 w-auto"
                      priority
                    />
                  </div>
                  <span className="font-bold text-xl text-gray-900 dark:text-white">UU AI Society</span>
                </Link>
              )}

              {/* Desktop Navigation */}
              <div className="hidden md:flex items-center md:gap-1 lg:gap-4">
                <nav className="flex md:gap-1 lg:gap-4">
                  {navigation.map((item) => (
                      <Link
                        key={item.name}
                        href={item.href}
                        className={`px-2 lg:px-3 py-2 rounded-md text-xs lg:text-sm font-medium whitespace-nowrap transition-colors duration-200 ${getNavClass(isActive(item.href))}`}
                      >
                        {item.name}
                      </Link>
                    ))}
                    {isAdmin && (<>
                     <div key="Projects" className="relative" ref={projectsRef}>
                       <button
                          onClick={() => setIsProjectsOpen(!isProjectsOpen)}
                          className={`px-2 lg:px-3 py-2 rounded-md text-xs lg:text-sm font-medium whitespace-nowrap transition-colors duration-200 flex items-center gap-1 cursor-pointer ${getNavClass(isActive('/projects'))}`}
                       >
                         Projects
                         <svg className={`w-4 h-4 transition-transform ${isProjectsOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                         </svg>
                       </button>
                      {isProjectsOpen && (
                        <div className={`absolute left-0 mt-2 w-48 rounded-md shadow-lg py-1 border transition-all duration-200 overflow-hidden animate-in fade-in slide-in-from-top-2 ${
                          isHomePage
                            ? 'bg-black/40 backdrop-blur-lg border-gray-700/50'
                            : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700'
                        }`}>
                          <Link
                            href="/projects"
                            onClick={() => setIsProjectsOpen(false)}
                            className={`block px-4 py-2 rounded-md text-sm transition-colors duration-200 ${
                              isHomePage
                                ? 'text-white/90 hover:text-white hover:bg-white/20'
                                : 'text-gray-700 dark:text-gray-300 hover:bg-red-600/20 hover:text-red-600 dark:hover:text-red-400'
                            } cursor-pointer`}
                          >
                            All Projects
                          </Link>
                          <Link
                            href="/explore"
                            onClick={() => setIsProjectsOpen(false)}
                            className={`block px-4 py-2 rounded-md text-sm transition-colors duration-200 ${
                              isHomePage
                                ? 'text-white/90 hover:text-white hover:bg-white/20'
                                : 'text-gray-700 dark:text-gray-300 hover:bg-red-600/20 hover:text-red-600 dark:hover:text-red-400'
                            } cursor-pointer`}
                          >
                            Course Navigator
                          </Link>
                          {user && (
                            <Link
                              href="/my-courses"
                              onClick={() => setIsProjectsOpen(false)}
                              className={`block px-4 py-2 pl-6 rounded-md text-sm transition-colors duration-200 ${
                                isHomePage
                                  ? 'text-white/70 hover:text-white hover:bg-white/20'
                                  : 'text-gray-500 dark:text-gray-400 hover:bg-red-600/20 hover:text-red-600 dark:hover:text-red-400'
                            } cursor-pointer`}
                            >
                              My Favorites
                            </Link>
                          )}
                        </div>
                      )}
                    </div>
                    <Link
                      href="/admin"
                      className={`px-2 lg:px-3 py-2 rounded-md text-xs lg:text-sm font-medium whitespace-nowrap transition-colors duration-200 ${getNavClass(isActive('/admin'))}`}
                    >
                      Admin
                    </Link>
                    </>
                  )}
                    {/* Theme toggle */}
                     <ThemeToggle isHomePage={isHomePage} />
                 </nav>
              </div>

               {/* Mobile menu button */}
               <div className="md:hidden">
                <button
                    ref={mobileButtonRef}
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className={`p-2 rounded-md transition-all hover:scale-110 ${getMobileButtonClass()}`}
                    aria-expanded="false"
                  >
                   <span className="sr-only">Open main menu</span>
                   {isMenuOpen ? (
                     <X className="h-6 w-6" />
                   ) : (
                     <Menu className="h-6 w-6" />
                   )}
                 </button>
               </div>
             </div>

                {/* Mobile Navigation */}
                <div
                  ref={mobileMenuRef}
                  className={`md:hidden absolute top-full left-0 right-0 z-50 transition-all duration-300 overflow-hidden ${
                    isMenuOpen 
                      ? 'opacity-100 translate-y-0' 
                      : 'opacity-0 -translate-y-2 pointer-events-none'
                  } ${getMobileNavClass()}`}
                  inert={!isMenuOpen}
                >
                <div className={`px-2 pt-2 pb-3 space-y-1 ${isHomePage ? '' : 'border-t border-gray-100 dark:border-gray-800'}`}>
                  {navigation.map((item) => (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setIsMenuOpen(false)}
                      className={`block px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${getNavClass(isActive(item.href))}`}
                    >
                      {item.name}
                    </Link>
                  ))}
                    {isAdmin && (
                     <div key="Projects" className="relative" ref={mobileProjectsRef}>
                       <button
                         onClick={(e) => { e.stopPropagation(); setIsProjectsOpen(!isProjectsOpen); }}
                         className={`px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 flex items-center gap-1 cursor-pointer ${getNavClass(isActive('/projects'))}`}
                       >
                         Projects
                        <svg className={`w-4 h-4 transition-transform ${isProjectsOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      <div className={`pl-4 space-y-1 transition-all duration-200 overflow-hidden ${
                        isProjectsOpen ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'
                      }`}>
                         {['/projects', '/explore', '/study-plan'].map((href) => (
                           <Link
                             key={href}
                             href={href}
                             onClick={() => { setIsMenuOpen(false); setIsProjectsOpen(false); }}
                             className={`block px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                               isHomePage
                                 ? 'text-white/90 hover:text-white hover:bg-white/20'
                                 : 'text-gray-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-600/20'
                             }`}
                           >
                             {href === '/projects' ? 'All Projects' : href === '/explore' ? 'Course Navigator' : 'Study Plan Graph'}
                           </Link>
                         ))}
                       </div>
                   </div>
                 )}
                    {isAdmin && (
                      <Link
                        href="/admin"
                        onClick={() => setIsMenuOpen(false)}
                        className={`block px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${getNavClass(isActive('/admin'))}`}
                      >
                        Admin
                      </Link>
                    )}
                 <ThemeToggle isHomePage={isHomePage} />
               </div>
            </div>
          </div>
        </div>
      </header>
      {/* Spacer for fixed header */}
      {!isHomePage && <div aria-hidden className="h-[100px]" />}
    </>
  );
};
