'use client'

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { useAdmin } from '@/hooks/useAdmin';
import { useEffect, useState } from 'react';
import { getUserProfile, type UserProfile } from '@/lib/firestore/users';

export const Header: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();
  const { user, isAdmin, loading, logout } = useAdmin();
  const [profile, setProfile] = useState<UserProfile | null>(null);

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

  const navigation = [
    { name: 'Home', href: '/' },
    { name: 'Events', href: '/events' },
    { name: 'Newsletter', href: '/blog' },
    // { name: 'Job board', href: '/careers' },
    { name: 'About', href: '/about' },
    { name: 'Contact', href: '/contact' }
  ];
  const isActive = (path: string) => {
    return pathname === path;
  };

  return (
    <>
    <header className="fixed top-0 w-full z-50">
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
                {isAdmin && (
                  <> 
                  {/* Job board as admin-only for testing */}
                  <Link href="/careers" className={`px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${isActive('/careers')
                    ? 'bg-red-600/20 text-red-600 dark:text-red-400'
                    : 'text-gray-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-600/20'}`}>Job board</Link>
                  <Link
                    href="/admin"
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${isActive('/admin')
                      ? 'bg-red-600/20 text-red-600 dark:text-red-400'
                      : 'text-gray-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-600/20'
                      }`}
                  >
                    Admin
                  </Link>
                  </>
                )}
                <ThemeToggle />
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
                  className={`block px-3 py-2 rounded-md text-base font-medium transition-colors duration-200 ${isActive(item.href)
                    ? 'text-gray-700 dark:text-gray-300 bg-red-600/20'
                    : 'text-gray-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-600/20'
                    }`}
                >
                  {item.name}
                </Link>
              ))}
              {isAdmin && (
                <Link
                  href="/admin"
                  onClick={() => setIsMenuOpen(false)}
                  className={`block px-3 py-2 rounded-md text-base font-medium transition-colors duration-200 ${isActive('/admin')
                    ? 'bg-red-600/20'
                    : 'text-gray-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-600/20'
                    }`}
                >
                  Admin
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
    {/* Automatic spacer under fixed header: ~24px to avoid cramped content */}
    <div aria-hidden className="h-12" />
    </>
  );
};