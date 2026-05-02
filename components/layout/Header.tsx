'use client'

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Menu, X, Lock, LockOpen, ChevronDown, ChevronUp } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { useAdmin } from '@/hooks/useAdmin';
import { useEffect, useState, useRef } from 'react';
import { getUserProfile, type UserProfile } from '@/lib/firestore/users';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';

export const Header: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProjectsOpen, setIsProjectsOpen] = useState(false);
  const projectsRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const { user, isAdmin, loading, logout } = useAdmin();
  const [profile, setProfile] = useState<UserProfile | null>(null);

  // Read lock state from cookie on mount
  useEffect(() => {
    const cookies = document.cookie.split(';').map(c => c.trim());
    const lockCookie = cookies.find(c => c.startsWith('headerLocked='));
    if (lockCookie) {
      setIsLocked(lockCookie.split('=')[1] === 'true');
    }
  }, []);

  // Hide header on homepage, show on hover
  const isHomePage = pathname === '/';
  const [isHovered, setIsHovered] = useState(!isHomePage);
  const [isLocked, setIsLocked] = useState(false);

  const shouldShow = !isHomePage || isLocked || isHovered;

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
      if (projectsRef.current && !projectsRef.current.contains(event.target as Node)) {
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
      {/* Hover trigger area - only on homepage when header is hidden & not locked */}
      {isHomePage && !isHovered && !isLocked && (
        <div
          className="fixed top-0 left-0 w-full h-16 z-40"
          onMouseEnter={() => setIsHovered(true)}
        >
          {/* Gradient hint bar with shimmer */}
          <div className="absolute top-0 left-0 w-full h-[4px] bg-gradient-to-r from-transparent via-white/30 to-transparent dark:bg-linear-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
          <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2">
            <ChevronDown className="w-4 h-4 text-white/70 animate-pulse" />
          </div>
        </div>
      )}

      <header
        className={`fixed top-0 w-full z-50 transition-transform duration-300 ${
          shouldShow ? 'translate-y-0' : '-translate-y-full'
        }`}
        onMouseLeave={() => isHomePage && !isLocked && setIsHovered(false)}
      >
        {/* Top auth bar */}
        <div className="w-full bg-gray-100 dark:bg-gray-800 text-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-end h-9">            
            <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
              {!loading && !user && (
                <>
                  <Link href="/join" className="text-gray-700 dark:text-gray-300">Register</Link>
                  <Link href="/login" className="text-gray-700 dark:text-gray-300">Login</Link>
                </>
              )}
              {!loading && user && (
                <>
                  <span className="truncate max-w-[200px]">{profile?.displayName || profile?.name || user.displayName || (user as unknown as { name?: string }).name || user.email}</span>
                  <Link href="/account" className="text-gray-700 dark:text-gray-300">Account</Link>
                  <a onClick={() => logout()} className="text-gray-700 dark:text-gray-300 no-underline hover:underline cursor-pointer">Logout</a>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Main nav bar */}
        <div className="bg-white dark:bg-gray-900 backdrop-blur-sm border-b border-gray-100 dark:border-gray-800 shadow-sm transition-colors duration-300">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              {/* Logo */}
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

              {/* Desktop Navigation */}
              <div className="hidden md:flex items-center space-x-4">
                <nav className="flex space-x-4">
                  {navigation.map((item) => (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`px-3 py-2 rounded-md text-sm text-gray-900 dark:text-white font-medium transition-colors duration-200 ${isActive(item.href)
                        ? 'bg-red-600/20'
                        : 'text-gray-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-600/20'
                      }`}
                    >
                      {item.name}
                    </Link>
                  ))}
                  <Link
                    href="/board-apply"
                    className={`px-3 py-2 rounded-md text-sm text-gray-900 dark:text-white font-medium transition-colors duration-200 ${isActive('/board-apply')
                      ? 'bg-red-600/20'
                      : 'text-gray-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-600/20'
                    }`}
                  >
                    Join the Board!
                  </Link>
                  {isAdmin && (
                    <div key="Projects" className="relative" ref={projectsRef}>
                      <button
                        onClick={() => setIsProjectsOpen(!isProjectsOpen)}
                        className={`px-3 py-2 rounded-md text-sm text-gray-900 dark:text-white font-medium transition-colors duration-200 flex items-center gap-1 cursor-pointer ${isActive('/projects')
                          ? 'bg-red-600/20'
                          : 'text-gray-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-600/20'
                        }`}
                      >
                        Projects
                        <svg className={`w-4 h-4 transition-transform ${isProjectsOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      {isProjectsOpen && (
                        <div className="absolute left-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 border border-gray-100 dark:border-gray-700">
                          <Link
                            href="/projects"
                            onClick={() => setIsProjectsOpen(false)}
                            className="block px-4 py-2 rounded-md text-sm text-gray-700 dark:text-gray-300 hover:bg-red-600/20 hover:text-red-600 dark:hover:text-red-400 cursor-pointer"
                          >
                            All Projects
                          </Link>
                          <Link
                            href="/explore"
                            onClick={() => setIsProjectsOpen(false)}
                            className="block px-4 py-2 rounded-md text-sm text-gray-700 dark:text-gray-300 hover:bg-red-600/20 hover:text-red-600 dark:hover:text-red-400 cursor-pointer"
                          >
                            Course Navigator
                          </Link>
                          {user && (
                            <Link
                              href="/my-courses"
                              onClick={() => setIsProjectsOpen(false)}
                              className="block px-4 py-2 pl-6 rounded-md text-sm text-gray-500 dark:text-gray-400 hover:bg-red-600/20 hover:text-red-600 dark:hover:text-red-400 cursor-pointer"
                            >
                              My Favorites
                            </Link>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  {isAdmin && (
                    <>
                      <Link
                        href="/admin"
                        className={`px-3 py-2 rounded-md text-sm text-gray-900 dark:text-white font-medium transition-colors duration-200 ${isActive('/admin')
                          ? 'bg-red-600/20'
                          : 'text-gray-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-600/20'
                        }`}
                      >
                        Admin
                      </Link>
                    </>
                  )}
                  {/* Lock + Theme toggle group */}
                  <div className="flex items-center gap-4">
                    <ThemeToggle />
                    {/* Lock toggle - only on homepage */}
                    {isHomePage && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => {
                                const newVal = !isLocked;
                                setIsLocked(newVal);
                                document.cookie = "headerLocked=" + newVal + "; path='/'; max-age=31536000";
                              }}
                              className="cursor-pointer text-gray-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                            >
                              {isLocked ? <Lock className="h-4 w-4" /> : <LockOpen className="h-4 w-4" />}
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{isLocked ? 'Unlock header' : 'Lock header'}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                </nav>
              </div>

              {/* Mobile menu button */}
              <div className="md:hidden">
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="p-2 rounded-md text-gray-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
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
            <div className={`md:hidden ${isMenuOpen ? 'block' : 'hidden'}`}>
              <div className="px-2 pt-2 pb-3 space-y-1 border-t border-gray-100 dark:border-gray-800">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setIsMenuOpen(false)}
                    className={`block px-3 py-2 rounded-md text-sm text-gray-900 dark:text-white font-medium transition-colors duration-200  ${isActive(item.href)
                      ? 'bg-red-600/20'
                      : 'text-gray-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-600/20'
                    }`}
                  >
                    {item.name}
                  </Link>
                ))}
                <Link
                  href="/board-apply"
                  onClick={() => setIsMenuOpen(false)}
                  className={`block px-3 py-2 rounded-md text-sm text-gray-900 dark:text-white font-medium transition-colors duration-200  ${isActive('/board-apply')
                    ? 'bg-red-600/20'
                    : 'hover:text-red-600 dark:hover:text-red-400 hover:bg-red-600/20'
                  }`}
                >
                  Join the Board!
                </Link>
                {isAdmin && (
                  <div key="Projects" className="relative">
                    <button
                      onClick={() => setIsProjectsOpen(!isProjectsOpen)}
                      className={`px-3 py-2 rounded-md text-sm text-gray-900 dark:text-white font-medium transition-colors duration-200 flex items-center gap-1 cursor-pointer ${isActive('/projects')
                        ? 'bg-red-600/20'
                        : 'text-gray-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-600/20'
                      }`}
                    >
                      Projects
                      <svg className={`w-4 h-4 transition-transform ${isProjectsOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {isProjectsOpen && (
                      <div className="pl-4 space-y-1">
                        <Link
                          href="/projects"
                          onClick={() => setIsMenuOpen(false)}
                          className="block px-4 py-2 rounded-md text-sm text-gray-900 dark:text-white font-medium transition-colors duration-200"
                        >
                          All Projects
                        </Link>
                        <Link
                          href="/explore"
                          onClick={() => setIsMenuOpen(false)}
                          className="block px-4 py-2 rounded-md text-sm text-gray-900 dark:text-white font-medium transition-colors duration-200"
                        >
                          Course Navigator
                        </Link>
                        <Link
                          href="/study-plan"
                          onClick={() => setIsMenuOpen(false)}
                          className="block px-4 py-2 rounded-md text-sm text-gray-900 dark:text-white font-medium transition-colors duration-200"
                        >
                          Study Plan Graph
                        </Link>
                      </div>
                    )}
                  </div>
                )}
                {isAdmin && (
                  <>
                    <Link
                      href="/projects"
                      onClick={() => setIsMenuOpen(false)}
                      className={`block px-3 py-2 rounded-md text-sm text-gray-900 dark:text-white font-medium transition-colors duration-200 cursor-pointer ${isActive('/projects')
                        ? ' bg-red-600/20'
                        : ' hover:text-red-600 dark:hover:text-red-400 hover:bg-red-600/20'
                      }`}
                    >
                      Projects
                    </Link>
                    <Link
                      href="/admin"
                      onClick={() => setIsMenuOpen(false)}
                      className={`block px-3 py-2 rounded-md text-sm text-gray-900 dark:text-white font-medium transition-colors duration-200  ${isActive('/admin')
                        ? 'bg-red-600/20'
                        : 'text-gray-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-600/20'
                      }`}
                    >
                      Admin
                    </Link>
                  </>
                )}
                <ThemeToggle />
              </div>
            </div>
          </div>
        </div>
      </header>
      {/* Spacer only for non-homepage pages */}
      {!isHomePage && <div aria-hidden className="h-12" />}
    </>
  );
};
