'use client';

// The home page's static pieces, shared by the page and its loading skeleton
// (the (home) loading boundary), so the skeleton has the page's exact geometry.
// Kept free of the page's data and canvases: the boundary ships ahead of the page.

import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import HeroSplash from '@/components/HeroSplash';
import { Button } from '@/components/ui/Button';
import { DiscordCta } from '@/components/common/DiscordCta';
import {
  CardSkeleton,
  SkeletonRegion,
  SkeletonText,
} from '@/components/ui/skeleton';

// "(Upcoming) Events" — the parenthesised word carries the accent, the rest is ink.
export const SectionHead: React.FC<{
  paren: string;
  title: string;
  action?: { href: string; label: string };
}> = ({ paren, title, action }) => (
  <div className="flex items-end justify-between gap-6 mb-10">
    <h2 className="display-md">
      <span className="paren">({paren})</span> {title}
    </h2>
    {action && (
      <Link
        href={action.href}
        className="hidden sm:inline-flex items-center gap-1.5 shrink-0 h-9 px-4 rounded-md border border-border mono-label text-foreground/60 hover:text-foreground hover:border-foreground/25 transition-colors duration-300"
      >
        {action.label}
        <ArrowRight className="h-3 w-3" />
      </Link>
    )}
  </div>
);

// Shared by the cards and their loading placeholders.
export const CARD_SHELL = 'glass flex flex-col overflow-hidden';
export const CARD_GRID = 'grid sm:grid-cols-2 lg:grid-cols-3 gap-5';
export const SECTION = 'px-5 sm:px-8 pt-24 sm:pt-32 cv-auto';

const pillars = [
  {
    title: 'AI knowledge',
    description:
      'Workshops and guest lectures from industry professionals working on the latest in artificial intelligence and machine learning.',
  },
  {
    title: 'Community',
    description:
      'Find like-minded students and connect with the AI community at large.',
  },
  {
    title: 'Innovation',
    description:
      'Build projects and enter hackathons to push your knowledge of AI and discover new opportunities.',
  },
  {
    title: 'Industry connections',
    description:
      'Network with professionals and get a read on AI careers, from early-stage startups to international giants.',
  },
];

/** The landing hero. The page passes in its canvases; without them (the loading skeleton) the hero keeps its geometry. */
export const HomeHero: React.FC<{
  backdrop?: React.ReactNode;
  animation?: React.ReactNode;
}> = ({ backdrop, animation }) => (
  <>
    {/* ---------------------------------------------------------------- Hero
      A theme-aware slab — dark ink in dark mode, white paper in light —
      with interior radial light. Reads as an object on the page and gives
      the glass controls something to sit on. Pulled up behind the fixed
      header so the nav's glass blurs the hero itself. */}
    <HeroSplash className="-mt-14">
      {backdrop}

      <div className="relative z-10 max-w-7xl mx-auto pt-14 grid grid-rows-[auto_1fr] lg:grid-rows-none lg:grid-cols-[1.05fr_0.95fr] items-center lg:content-stretch min-h-[calc(100dvh+3.5rem)]">
        <div className="order-2 lg:order-1 px-6 sm:px-8 lg:px-8 pb-14 lg:py-14">
          <p className="mono-label text-foreground/65 mb-6">
            Uppsala · AI Society
          </p>

          <h1 className="display-xl mb-7">
            Build the future.
            <span className="block text-foreground/65">(Start here.)</span>
          </h1>

          <p className="text-base sm:text-lg text-current/60 max-w-md leading-relaxed mb-9">
            Uniting Uppsala students driven by AI, tech, and meaningful
            collaboration.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <Button asChild variant="cta" size="lg">
              <Link href="/join" className="dark:bg-white dark:text-ink">
                Join for free
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/events">Our events</Link>
            </Button>
            <Button asChild variant="ghost" size="lg" className="px-3">
              <Link href="/about">
                Learn about UU AI Society
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
              </Link>
            </Button>
          </div>
        </div>

        {/* lg:pt-px keeps the canvas just below the header's 1px border: any overlap
            makes the header's backdrop blur redraw on every animation frame. */}
        <div className="order-1 lg:order-2 flex items-center justify-center w-full min-h-[10rem] pt-8 lg:pt-px lg:h-full">
          {animation ?? (
            // The animation canvas's box (it has a 200px min height).
            <div className="w-full h-full min-h-[200px]" />
          )}
        </div>
      </div>
    </HeroSplash>
  </>
);

export const Pillars = () => (
  <>
    {/* ------------------------------------------------------------- Pillars
      A numbered editorial list on hairlines — deliberately not four cards
      with an icon in a tinted rounded square. */}
    <section className={SECTION}>
      <div className="max-w-6xl mx-auto">
        <SectionHead paren="Why" title="Join UU AI Society" />

        <div className="grid sm:grid-cols-2 gap-x-14 border-t border-border">
          {pillars.map((pillar, i) => (
            <div
              key={pillar.title}
              className="group flex gap-6 py-8 border-b border-border"
            >
              <span className="mono-label text-muted-foreground pt-1.5 tabular-nums shrink-0 transition-colors duration-500 group-hover:text-primary">
                {String(i + 1).padStart(2, '0')}
              </span>
              <div>
                <h3 className="text-lg font-semibold tracking-[-0.02em] mb-2">
                  {pillar.title}
                </h3>
                <p className="text-[0.9375rem] leading-relaxed text-muted-foreground max-w-sm">
                  {pillar.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  </>
);

export const JoinCta = () => (
  <>
    {/* ---------------------------------------------------------------- CTA */}
    <section className={SECTION}>
      <div className="max-w-6xl mx-auto">
        <div className="glass rounded-lg px-8 sm:px-14 py-14 sm:py-20 text-center">
          <p className="mono-label text-foreground/65 mb-6">
            Membership is free
          </p>
          <h2 className="display-lg mb-5 max-w-2xl mx-auto">
            Everything starts with <span className="paren">(showing up)</span>
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto mb-9 leading-relaxed">
            Join the society, get the newsletter, and hear about events before
            anyone else.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/join"
              className="inline-flex items-center gap-2 h-12 px-8 rounded-md bg-primary text-primary-foreground font-medium tracking-[-0.01em] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.22)] transition-[filter,transform] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:brightness-110 active:scale-[0.97]"
            >
              Become a member
              <ArrowRight className="h-4 w-4" />
            </Link>
            <DiscordCta className="h-12 px-6" />
          </div>
        </div>
      </div>
    </section>
  </>
);

// A showcase card leads with its category in mono.
const ShowcaseCardSkeleton = () => (
  <CardSkeleton className={`${CARD_SHELL} rounded-xl`}>
    <div className="flex flex-col flex-1 p-5">
      <SkeletonText className="mono-meta mb-2" widths={['30%']} />
      <SkeletonText
        className="text-[1.0625rem] leading-snug mb-2"
        widths={['75%']}
      />
      <SkeletonText className="text-sm leading-relaxed mb-5" lines={2} />
      <div className="mt-auto pt-4 border-t border-border">
        <SkeletonText className="mono-meta" widths={['55%']} />
      </div>
    </div>
  </CardSkeleton>
);

const SectionSkeleton: React.FC<{
  head: React.ComponentProps<typeof SectionHead>;
  card: () => React.ReactNode;
}> = ({ head, card }) => (
  <section className={SECTION}>
    <div className="max-w-6xl mx-auto">
      <SectionHead {...head} />
      <div className={CARD_GRID}>
        {card()}
        {card()}
        {card()}
      </div>
    </div>
  </section>
);

/** The home page while it loads: the real hero, pillars and closing call, with placeholder cards where events, projects and articles go. */
export const HomeSkeleton = () => (
  <SkeletonRegion label="Loading…" className="pb-24">
    <HomeHero />
    <Pillars />
    <SectionSkeleton
      head={{
        paren: 'Upcoming',
        title: 'Events',
        action: { href: '/events', label: 'See all events' },
      }}
      card={() => <CardSkeleton className={`${CARD_SHELL} rounded-md`} />}
    />
    <SectionSkeleton
      head={{
        paren: 'Community',
        title: 'What members are building',
        action: { href: '/showcase', label: 'View Showcase' },
      }}
      card={() => <ShowcaseCardSkeleton />}
    />
    <SectionSkeleton
      head={{
        paren: 'From the blog',
        title: 'Articles',
        action: { href: '/blog', label: 'Read the blog' },
      }}
      card={() => <CardSkeleton className={`${CARD_SHELL} rounded-md`} />}
    />
    <JoinCta />
  </SkeletonRegion>
);
