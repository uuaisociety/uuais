'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, ArrowUp } from 'lucide-react';
import { HugeiconsIcon } from '@hugeicons/react';
import { LinkedinIcon, InstagramIcon } from '@hugeicons/core-free-icons';
import { DiscordCta } from '@/components/common/DiscordCta';
import { logoBox, partnersInTier } from '@/lib/partners';

const quickLinks = [
  { href: '/', label: 'Home' },
  { href: '/events', label: 'Events' },
  { href: '/careers', label: 'Job board' },
  { href: '/partners', label: 'Partners' },
  { href: '/about', label: 'About us' },
  { href: '/about#contact', label: 'Contact' },
];

const contacts = [
  { address: 'contact@uuais.com', label: 'General' },
  { address: 'partnerships@uuais.com', label: 'Partnerships' },
  { address: 'it@uuais.com', label: 'Website' },
];

export const Footer: React.FC = () => {
  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  const linkClass =
    'text-[0.9375rem] text-muted-foreground hover:text-foreground transition-colors duration-300';

  return (
    <footer className="mt-24 px-5 sm:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Principal (Alpha) partners only, kept quiet; every tier lives on /partners. */}
        {/* Equal side columns keep the logos on the page's true centre, whatever the label and link widths. */}
        <div className="py-10 border-t border-border flex flex-col items-center gap-6 lg:grid lg:grid-cols-[1fr_auto_1fr] lg:gap-10">
          <p className="mono-label text-muted-foreground lg:justify-self-start">
            Principal partners
          </p>
          <ul className="flex flex-wrap items-center justify-center gap-x-8 gap-y-5">
            {partnersInTier('alpha').map((p) => (
              <li key={p.name}>
                <a
                  href={p.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${p.name} (opens in a new tab)`}
                  className="block rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Image
                    src={p.logo}
                    alt={p.name}
                    loading="lazy"
                    {...logoBox(p, 6400)}
                    className="grayscale opacity-55 hover:grayscale-0 hover:opacity-100 transition-[opacity,filter] duration-300 dark:brightness-0 dark:invert dark:opacity-60 dark:hover:opacity-100"
                  />
                </a>
              </li>
            ))}
          </ul>
          <Link
            href="/partners"
            className="group inline-flex items-center gap-1.5 mono-label text-muted-foreground hover:text-foreground transition-colors duration-300 lg:justify-self-end"
          >
            All partners
            <ArrowRight
              className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5"
              aria-hidden
            />
          </Link>
        </div>

        {/* Columns */}
        <div className="grid grid-cols-1 md:grid-cols-[1.4fr_1fr_1fr] gap-12 py-16 border-t border-border">
          <div>
            <div className="flex items-center gap-2 mb-5">
              <Image
                src="/images/logo-highdef.png"
                alt=""
                width={40}
                height={40}
                className="h-9 w-9"
              />
              <span className="text-base font-semibold tracking-[-0.03em] transition-colors duration-300">
                UU AI Society
              </span>
            </div>
            <p className="text-[0.9375rem] leading-relaxed text-muted-foreground max-w-xs mb-7">
              Connecting students passionate about artificial intelligence —
              through hands-on learning, events, and the people building it.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <DiscordCta />
              <a
                href="https://linkedin.com/company/uu-ai-society"
                aria-label="LinkedIn"
                className="size-10 grid place-items-center rounded-full border border-border text-foreground/55 hover:text-foreground hover:border-foreground/25 transition-colors duration-300"
              >
                <HugeiconsIcon icon={LinkedinIcon} className="h-4 w-4" />
              </a>
              <a
                href="https://instagram.com/uuaisociety"
                aria-label="Instagram"
                className="size-10 grid place-items-center rounded-full border border-border text-foreground/55 hover:text-foreground hover:border-foreground/25 transition-colors duration-300"
              >
                <HugeiconsIcon icon={InstagramIcon} className="h-4 w-4" />
              </a>
            </div>
          </div>

          <nav>
            <p className="mono-label text-muted-foreground mb-5">Navigation</p>
            <ul className="space-y-3">
              {quickLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} prefetch className={linkClass}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <p className="mono-label text-muted-foreground mb-5">Contact</p>
            <ul className="space-y-3">
              {contacts.map((c) => (
                <li key={c.address}>
                  <a href={`mailto:${c.address}`} className={linkClass}>
                    {c.address}
                  </a>
                  <span className="block mono-label text-muted-foreground mt-0.5">
                    {c.label}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="py-7 border-t border-border flex flex-col sm:flex-row justify-between items-center gap-4">
          {/* Copyright and actions keep their width; the hidden line takes what is left, clipped to one row. */}
          <p className="mono-meta text-muted-foreground text-center sm:text-left sm:shrink-0">
            © {new Date().getFullYear()} UU AI Society ·{' '}
            <span className="whitespace-nowrap">Org. 802551-8930</span>
          </p>
          <p
            aria-hidden
            className="min-w-0 max-w-full flex-1 truncate opacity-[0.0] select-none pointer-events-none text-xs"
          >
            VVVBSVMgSVQgVEVBTSBSRUNSVUlUSU5HOiBlbWFpbCBpdEB1dWFpcy5jb20gc3ViamVjdCAiYWdlbnQgZm91bmQgbWUi
          </p>
          <div className="flex shrink-0 items-center gap-2">
            <Link
              href="/privacy"
              className="whitespace-nowrap px-3 py-1.5 rounded-full mono-label text-muted-foreground hover:text-foreground hover:bg-foreground/[0.05] transition-colors duration-300"
            >
              Privacy policy
            </Link>
            <button
              onClick={scrollToTop}
              className="size-11 grid place-items-center rounded-full border border-border text-foreground/50 hover:text-foreground hover:border-foreground/25 transition-colors duration-300 cursor-pointer"
              aria-label="Scroll to top"
            >
              <ArrowUp className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};
