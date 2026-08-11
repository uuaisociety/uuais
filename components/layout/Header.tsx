'use client'

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Menu, X, ChevronDown } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { useAdmin } from '@/hooks/useAdmin';
import { useApp } from '@/contexts/AppContext';
import { useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/Button';

const navigation = [
  { name: 'Home', href: '/' },
  { name: 'Events', href: '/events' },
  { name: 'Job board', href: '/careers' },
  { name: 'About', href: '/about' },
  { name: 'Contact', href: '/contact' },
];

const projectLinks = [
  { href: '/projects', label: 'All projects' },
  { href: '/explore', label: 'Course navigator' },
  { href: '/my-courses', label: 'My favourites' },
];

export const Header: React.FC = () => {
  const { state } = useApp();
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProjectsOpen, setIsProjectsOpen] = useState(false);
  const [prevPathname, setPrevPathname] = useState(pathname);
  const projectsRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const mobileButtonRef = useRef<HTMLButtonElement>(null);
  const { user, isAdmin, cached, logout } = useAdmin();

  // Close the menus on navigation rather than letting them hang over the new page.
  // Done during render (state adjustment when a prop changes) instead of an effect.
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setIsMenuOpen(false);
    setIsProjectsOpen(false);
  }

  // Hide the Apply CTA when no open application campaign exists (show it while
  // campaigns are still loading to avoid a flicker on first paint).
  const showApply = !state.campaignsLoaded || state.campaigns.some((c) => c.status === 'open');

  // Rendered from the persisted identity so the name survives a reload instead
  // of blanking while Firebase re-resolves the session.
  const identity = user
    ? { name: cached?.name || user.displayName || user.email, showAdmin: isAdmin }
    : cached
      ? { name: cached.name || cached.email, showAdmin: cached.isAdmin }
      : null;

  const isActive = (path: string) => pathname === path;

  useEffect(() => {
    if (!isProjectsOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (!projectsRef.current?.contains(event.target as Node)) setIsProjectsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isProjectsOpen]);

  useEffect(() => {
    if (!isMenuOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (mobileButtonRef.current?.contains(target) || mobileMenuRef.current?.contains(target)) return;
      setIsMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMenuOpen]);

  const navLinkClass = (active: boolean) =>
    `relative px-3 py-1.5 rounded-sm text-[0.8125rem] font-medium tracking-[-0.01em] transition-colors duration-300 ${
      active
        ? 'text-current bg-current/[0.12]'
        : 'text-current/60 hover:text-current hover:bg-current/[0.07]'
    }`;

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 glass-nav">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-14 flex items-center justify-between gap-2">

            {/* Wordmark */}
            <Link href="/" className="flex items-center gap-2 pl-1 shrink-0 group">
              <Image
                src="/images/logo-highdef.png"
                alt=""
                width={240}
                height={40}
                className="h-8 w-auto"
                priority
              />
              <span className="hidden sm:block text-[0.9375rem] font-semibold tracking-[-0.03em] transition-colors duration-300">
                UU AI Society
              </span>
            </Link>

            {/* Desktop nav */}
            <nav className="hidden lg:flex items-center gap-0.5">
              {navigation.map((item) => (
                <Link key={item.name} href={item.href} prefetch className={navLinkClass(isActive(item.href))}>
                  {item.name}
                </Link>
              ))}

              {identity?.showAdmin && (
                <div className="relative" ref={projectsRef}>
                  <button
                    onClick={() => setIsProjectsOpen((v) => !v)}
                    aria-expanded={isProjectsOpen}
                    aria-haspopup="true"
                    className={`${navLinkClass(pathname.startsWith('/projects') || pathname.startsWith('/explore'))} inline-flex items-center gap-1 cursor-pointer`}
                  >
                    Projects
                    <ChevronDown className={`h-3 w-3 transition-transform duration-300 ${isProjectsOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {isProjectsOpen && (
                    <div className="glass-pop absolute left-0 mt-2 w-52 rounded-md p-1.5 animate-rise">
                      {projectLinks.map((link) => (
                        <Link
                          key={link.href}
                          href={link.href}
                          className="block px-3 py-2 rounded-sm text-[0.8125rem] text-current/70 hover:text-current hover:bg-current/[0.09] transition-colors"
                        >
                          {link.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {identity?.showAdmin && (
                <Link href="/admin" className={navLinkClass(isActive('/admin'))}>Admin</Link>
              )}
            </nav>

            {/* Right cluster */}
            <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
              <div className="hidden md:flex items-center gap-1">
                {identity ? (
                  <>
                    <Link
                      href="/account"
                      className={`max-w-[140px] truncate px-3 py-1.5 rounded-sm mono-meta text-current/70 hover:text-current hover:bg-current/[0.07] transition-colors ${isActive('/account') ? 'bg-current/[0.12]' : ''}`}
                      title={identity.name ?? undefined}
                    >
                      {identity.name}
                    </Link>
                    <button
                      onClick={() => logout()}
                      className="px-3 py-1.5 rounded-sm mono-label text-current/60 hover:text-current transition-colors cursor-pointer"
                    >
                      Logout
                    </button>
                  </>
                ) : (
                  <>
                    <Link href="/join" className="px-3 py-1.5 rounded-sm mono-label text-current/70 hover:text-current hover:bg-current/[0.07] transition-colors">
                      Register
                    </Link>
                    <Link href="/login" className="px-3 py-1.5 rounded-sm mono-label text-current/70 hover:text-current hover:bg-current/[0.07] transition-colors">
                      Login
                    </Link>
                  </>
                )}
              </div>

              <ThemeToggle className="text-current/60 hover:text-current hover:bg-current/[0.09]" />

              {showApply && (
                <Button asChild variant="cta" size="sm" className="hidden sm:inline-flex">
                  <Link href="/apply/team">Apply</Link>
                </Button>
              )}

              <button
                ref={mobileButtonRef}
                onClick={() => setIsMenuOpen((v) => !v)}
                className="lg:hidden size-9 grid place-items-center rounded-sm text-current/70 hover:text-current hover:bg-current/[0.09] transition-colors cursor-pointer"
                aria-expanded={isMenuOpen}
                aria-controls="mobile-menu"
              >
                <span className="sr-only">Open main menu</span>
                {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {/* Mobile menu */}
          <div
            ref={mobileMenuRef}
            id="mobile-menu"
            inert={!isMenuOpen}
            className={`lg:hidden overflow-hidden origin-top transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${
              isMenuOpen ? 'max-h-[80vh] opacity-100' : 'max-h-0 opacity-0 pointer-events-none'
            }`}
          >
            <div className="py-2 border-t border-current/10">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  prefetch
                  className={`block px-3.5 py-2.5 rounded-sm text-sm font-medium transition-colors ${
                    isActive(item.href) ? 'text-current bg-current/[0.12]' : 'text-current/65 hover:text-current hover:bg-current/[0.07]'
                  }`}
                >
                  {item.name}
                </Link>
              ))}

              {identity?.showAdmin && (
                <>
                  <div className="my-1.5 h-px bg-current/10" />
                  {projectLinks.map((link) => (
                    <Link key={link.href} href={link.href} className="block px-3.5 py-2.5 rounded-sm text-sm text-current/65 hover:text-current hover:bg-current/[0.07] transition-colors">
                      {link.label}
                    </Link>
                  ))}
                  <Link href="/admin" className="block px-3.5 py-2.5 rounded-sm text-sm text-current/65 hover:text-current hover:bg-current/[0.07] transition-colors">
                    Admin
                  </Link>
                </>
              )}

              <div className="my-1.5 h-px bg-current/10" />
              {identity ? (
                <>
                  <Link href="/account" className="block px-3.5 py-2.5 rounded-sm mono-meta text-current/65 hover:text-current transition-colors">
                    {identity.name}
                  </Link>
                  <button onClick={() => logout()} className="w-full text-left px-3.5 py-2.5 rounded-sm mono-label text-current/60 hover:text-current transition-colors cursor-pointer">
                    Logout
                  </button>
                </>
              ) : (
                <div className="flex gap-2 px-1.5 py-1.5">
                  <Link href="/login" className="flex-1 text-center px-3 py-2 rounded-sm mono-label text-current/65 border border-current/10 hover:bg-current/[0.07] transition-colors">
                    Login
                  </Link>
                  <Link href="/join" className="flex-1 text-center px-3 py-2 rounded-sm mono-label text-current/65 border border-current/10 hover:bg-current/[0.07] transition-colors">
                    Register
                  </Link>
                </div>
              )}

              {showApply && (
                <Button asChild variant="cta" fullWidth className="sm:hidden mt-1.5">
                  <Link href="/apply/team">Apply</Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Spacer for the fixed header — constant, so page chrome never shifts */}
      <div className="h-14" aria-hidden />
    </>
  );
};
