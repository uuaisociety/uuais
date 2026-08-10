'use client'

// Disable static generation for this page
export const dynamic = 'force-dynamic';

import React, { useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { updatePageMeta } from '@/utils/seo';
import { format } from 'date-fns';
import campus from '@/public/images/campus.png';
import HeroAnimation from '@/components/HeroAnimation';
import FloatingSymbolsCanvas from '@/components/FloatingSymbolsCanvas';

const categoryOptions = [
  { value: 'all', label: 'All Categories' },
  { value: 'workshop', label: 'Workshop' },
  { value: 'guest_lecture', label: 'Guest Lecture' },
  { value: 'hackathon', label: 'Hackathon' },
  { value: 'other', label: 'Other' },
];

// "(Upcoming) Events" — the parenthesised word carries the accent, the rest is ink.
const SectionHead: React.FC<{
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

const pillars = [
  {
    title: 'AI knowledge',
    description:
      'Workshops and guest lectures from industry professionals working on the latest in artificial intelligence and machine learning.',
  },
  {
    title: 'Community',
    description: 'Find like-minded students and connect with the AI community at large.',
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

const HomePage: React.FC = () => {
  const { state } = useApp();

  useEffect(() => {
    updatePageMeta('Home', 'UU AI Society - Connecting students passionate about Artificial Intelligence');
  }, []);

  const now = new Date();
  const upcomingEvents = state.events
    .filter(event => event.published === true)
    .filter(event => !event.publishAt || new Date(event.publishAt) <= now)
    .filter(event => event.eventStartAt && new Date(event.eventStartAt) > now)
    .slice(0, 3);

  return (
    <div className="pb-24">

      {/* ---------------------------------------------------------------- Hero
          An inset dark slab rather than a full-bleed gradient: it reads as an
          object on the page, and gives the glass controls something to sit on. */}
      {/* Pulled up behind the fixed header so the nav's glass blurs the hero
          itself — otherwise it frosts the light page background and reads as a
          bright band above a near-black hero. */}
      <section className="-mt-14">
        <div className="relative overflow-hidden bg-[oklch(0.16_0.02_20)] text-white">
          {/* Interior light */}
          <div
            aria-hidden
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'radial-gradient(45rem 30rem at 78% 18%, oklch(0.55 0.21 27.5 / 55%), transparent 62%),' +
                'radial-gradient(38rem 28rem at 10% 92%, oklch(0.45 0.16 20 / 45%), transparent 60%)',
            }}
          />
          <FloatingSymbolsCanvas />

          <div className="relative z-10 max-w-7xl mx-auto pt-14 grid grid-rows-[auto_1fr] lg:grid-rows-none lg:grid-cols-[1.05fr_0.95fr] items-center lg:content-stretch min-h-[calc(100dvh+3.5rem)]">
            <div className="order-2 lg:order-1 px-6 sm:px-8 lg:px-8 pb-14 lg:py-14">
              <p className="mono-label text-white/45 mb-6">Uppsala University · AI Society</p>

              <h1 className="display-xl mb-7">
                Build the future.
                <span className="block text-white/40">(Start here.)</span>
              </h1>

              <p className="text-base sm:text-lg text-white/60 max-w-md leading-relaxed mb-9">
                Uniting Uppsala students driven by AI, tech, and meaningful collaboration.
              </p>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/events"
                  className="inline-flex items-center h-12 px-7 rounded-md bg-white text-[oklch(0.16_0.02_20)] text-[0.9375rem] font-medium tracking-[-0.01em] transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:scale-[1.02] active:scale-[0.98]"
                >
                  Our events
                </Link>
                <Link
                  href="/about"
                  className="group inline-flex items-center gap-2 h-12 px-7 rounded-md border border-white/20 bg-white/[0.06] backdrop-blur-xl text-[0.9375rem] font-medium tracking-[-0.01em] text-white/90 transition-colors duration-300 hover:bg-white/[0.13] hover:border-white/30"
                >
                  Learn more
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                </Link>
              </div>
            </div>

            <div className="order-1 lg:order-2 flex items-center justify-center w-full min-h-[10rem] pt-8 lg:pt-0 lg:h-full">
              <HeroAnimation />
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- Pillars
          A numbered editorial list on hairlines — deliberately not four cards
          with an icon in a tinted rounded square. */}
      <section className="px-5 sm:px-8 pt-24 sm:pt-32">
        <div className="max-w-6xl mx-auto">
          <SectionHead paren="Why" title="Join UU AI Society" />

          <div className="grid sm:grid-cols-2 gap-x-14 border-t border-border">
            {pillars.map((pillar, i) => (
              <div
                key={pillar.title}
                className="group flex gap-6 py-8 border-b border-border"
              >
                <span className="mono-label text-foreground/30 pt-1.5 tabular-nums shrink-0 transition-colors duration-500 group-hover:text-primary">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div>
                  <h3 className="text-lg font-semibold tracking-[-0.02em] mb-2">{pillar.title}</h3>
                  <p className="text-[0.9375rem] leading-relaxed text-muted-foreground max-w-sm">
                    {pillar.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------------- Events */}
      <section className="px-5 sm:px-8 pt-24 sm:pt-32">
        <div className="max-w-6xl mx-auto">
          <SectionHead paren="Upcoming" title="Events" action={{ href: '/events', label: 'See all events' }} />

          {upcomingEvents.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {upcomingEvents.map((event) => (
                <Link
                  key={event.id}
                  href={`/events/${event.id}`}
                  className="glass glass-interactive group flex flex-col overflow-hidden rounded-md"
                >
                  <div className="relative aspect-[16/10] overflow-hidden">
                    <Image
                      src={event.image || campus}
                      alt=""
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:scale-[1.04]"
                    />
                    <span className="absolute top-3 left-3 pill bg-black/45 text-white backdrop-blur-md">
                      {categoryOptions.find(o => o.value === event.category)?.label || event.category}
                    </span>
                  </div>

                  <div className="flex flex-col flex-1 p-5">
                    <h3 className="text-[1.0625rem] font-semibold tracking-[-0.02em] leading-snug mb-2">
                      {event.title}
                    </h3>
                    <p className="text-sm leading-relaxed text-muted-foreground line-clamp-2 mb-5">
                      {event.description}
                    </p>
                    <div className="mt-auto flex items-center justify-between pt-4 border-t border-border">
                      <span className="mono-meta text-foreground/50">
                        {(() => {
                          const d = new Date(event.eventStartAt);
                          return `${format(d, 'd MMM yyyy')} · ${format(d, 'HH:mm')}`;
                        })()}
                      </span>
                      <ArrowUpRight className="h-4 w-4 text-foreground/30 transition-all duration-300 group-hover:text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="border-t border-border py-16 text-center">
              <p className="mono-meta text-muted-foreground">
                No events scheduled — check back soon.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ---------------------------------------------------------------- CTA */}
      <section className="px-5 sm:px-8 pt-24 sm:pt-32">
        <div className="max-w-6xl mx-auto">
          <div className="glass rounded-lg px-8 sm:px-14 py-14 sm:py-20 text-center">
            <p className="mono-label text-foreground/40 mb-6">Membership is free</p>
            <h2 className="display-lg mb-5 max-w-2xl mx-auto">
              Everything starts with <span className="paren">(showing up)</span>
            </h2>
            <p className="text-muted-foreground max-w-md mx-auto mb-9 leading-relaxed">
              Join the society, get the newsletter, and hear about events before anyone else.
            </p>
            <Link
              href="/join"
              className="inline-flex items-center gap-2 h-12 px-8 rounded-md bg-primary text-primary-foreground font-medium tracking-[-0.01em] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.22)] transition-[filter,transform] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:brightness-110 active:scale-[0.97]"
            >
              Become a member
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
