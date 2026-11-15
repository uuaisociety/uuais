'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowUpRight, Star, Sparkles } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { updatePageMeta } from '@/utils/seo';
import { format } from 'date-fns';
import campus from '@/public/images/campus.png';
import { postPath } from '@/lib/slugify';
import { previewImageFor } from '@/lib/blog-preview';
import HeroAnimation from '@/components/HeroAnimation';
import FloatingSymbolsCanvas from '@/components/FloatingSymbolsCanvas';
import ShowcaseCover from '@/components/showcase/ShowcaseCover';
import { SHOWCASE_CATEGORY_LABELS } from '@/types';
import { CardSkeleton } from '@/components/ui/skeleton';
import {
  CARD_GRID,
  CARD_SHELL,
  HomeHero,
  JoinCta,
  Pillars,
  SECTION,
  SectionHead,
} from '@/components/pages/HomeLayout';

const categoryOptions = [
  { value: 'all', label: 'All Categories' },
  { value: 'workshop', label: 'Workshop' },
  { value: 'guest_lecture', label: 'Guest Lecture' },
  { value: 'hackathon', label: 'Hackathon' },
  { value: 'other', label: 'Other' },
];

const HomePage: React.FC = () => {
  const { state } = useApp();

  useEffect(() => {
    updatePageMeta(
      'Home',
      'UU AI Society - Connecting students passionate about Artificial Intelligence',
    );
  }, []);

  const now = new Date();
  const upcomingEvents = state.events
    .filter((event) => event.published === true)
    .filter((event) => !event.publishAt || new Date(event.publishAt) <= now)
    .filter((event) => event.eventStartAt && new Date(event.eventStartAt) > now)
    .slice(0, 3);

  // Featured first, then newest — and capped like the events and blog sections.
  const showcaseProjects = state.showcaseProjects
    .filter((p) => p.published)
    .sort(
      (a, b) =>
        Number(b.featured) - Number(a.featured) ||
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .slice(0, 3);

  const latestPosts = state.blogPosts
    .filter((post) => post.published)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 3);

  return (
    <div className="pb-24">
      <HomeHero
        backdrop={<FloatingSymbolsCanvas />}
        animation={<HeroAnimation />}
      />

      <Pillars />

      {/* -------------------------------------------------------------- Events */}
      <section className={SECTION}>
        <div className="max-w-6xl mx-auto">
          <SectionHead
            paren="Upcoming"
            title="Events"
            action={{ href: '/events', label: 'See all events' }}
          />

          {state.eventsLoaded && upcomingEvents.length === 0 ? (
            <div className="border-t border-border py-16 text-center">
              <p className="mono-meta text-muted-foreground">
                No events scheduled — check back soon.
              </p>
            </div>
          ) : (
            <div className={CARD_GRID}>
              {!state.eventsLoaded
                ? Array.from({ length: 3 }, (_, i) => (
                    <CardSkeleton
                      key={i}
                      className={`${CARD_SHELL} rounded-md`}
                    />
                  ))
                : upcomingEvents.map((event, i) => (
                    <Link
                      key={event.id}
                      href={`/events/${event.id}`}
                      className={`${CARD_SHELL} glass-interactive group rounded-md`}
                    >
                      <div className="relative aspect-[16/10] overflow-hidden">
                        <Image
                          src={event.image || campus}
                          alt=""
                          fill
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:scale-[1.04]"
                          loading={i === 0 ? 'eager' : 'lazy'}
                          fetchPriority={i === 0 ? 'high' : 'auto'}
                        />
                        <span className="absolute top-3 left-3 pill bg-black/45 text-white backdrop-blur-md">
                          {categoryOptions.find(
                            (o) => o.value === event.category,
                          )?.label || event.category}
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
                          <span className="mono-meta text-foreground/65">
                            {(() => {
                              const d = new Date(event.eventStartAt);
                              return `${format(d, 'd MMM yyyy')} · ${format(d, 'HH:mm')}`;
                            })()}
                          </span>
                          <ArrowUpRight className="h-4 w-4 text-foreground/60 transition-all duration-300 group-hover:text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                        </div>
                      </div>
                    </Link>
                  ))}
            </div>
          )}
        </div>
      </section>

      {/* ------------------------------------------------------------- Showcase
          A peek at the projects the community is building. */}
      <section className={SECTION}>
        <div className="max-w-6xl mx-auto">
          <SectionHead
            paren="Community"
            title="What members are building"
            action={{ href: '/showcase', label: 'View Showcase' }}
          />

          {showcaseProjects.length > 0 ? (
            <div className={CARD_GRID}>
              {showcaseProjects.map((project) => (
                <Link
                  key={project.id}
                  href={`/showcase/${project.slug || project.id}`}
                  className={`${CARD_SHELL} glass-interactive group rounded-xl`}
                >
                  <div className="relative aspect-[16/10] overflow-hidden">
                    <ShowcaseCover
                      title={project.title}
                      image={project.coverImage}
                      className="h-full w-full transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:scale-[1.04]"
                      sizes="(min-width: 1024px) 384px, (min-width: 640px) 50vw, 100vw"
                    />
                    {project.featured && (
                      <span className="absolute top-3 left-3 pill bg-black/45 text-white backdrop-blur-md">
                        <Star className="h-3 w-3 inline-block mr-1 -mt-px" />
                        Featured
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col flex-1 p-5">
                    <span className="mono-meta text-primary mb-2">
                      {SHOWCASE_CATEGORY_LABELS[project.category]}
                    </span>
                    <h3 className="text-[1.0625rem] font-semibold tracking-[-0.02em] leading-snug mb-2">
                      {project.title}
                    </h3>
                    <p className="text-sm leading-relaxed text-muted-foreground line-clamp-2 mb-5">
                      {project.description}
                    </p>
                    <div className="mt-auto flex items-center justify-between pt-4 border-t border-border">
                      <span className="mono-meta text-foreground/65 truncate">
                        By {project.creatorName || 'member'} ·{' '}
                        {project.votes || 0} votes
                      </span>
                      <ArrowUpRight className="h-4 w-4 text-foreground/60 transition-all duration-300 group-hover:text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="border-t border-border py-16 text-center">
              <p className="mono-meta text-muted-foreground">
                {state.showcaseUnavailable
                  ? 'Could not load member projects right now.'
                  : "No showcase projects yet. Be the first to share what you're building."}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* -------------------------------------------------------------- Blog */}
      {latestPosts.length > 0 && (
        <section className={SECTION}>
          <div className="max-w-6xl mx-auto">
            <SectionHead
              paren="From the blog"
              title="Articles"
              action={{ href: '/blog', label: 'Read the blog' }}
            />

            <div className={CARD_GRID}>
              {latestPosts.map((post) => (
                <Link
                  key={post.id}
                  href={`/blog/${postPath(post)}`}
                  className={`${CARD_SHELL} glass-interactive group rounded-md`}
                >
                  <div className="relative aspect-[16/10] overflow-hidden">
                    <Image
                      src={post.image || previewImageFor(post.id)}
                      alt=""
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:scale-[1.04]"
                      loading="lazy"
                    />
                    {post.authorType === 'ai' && (
                      <span className="absolute top-3 left-3 flex items-center gap-1.5">
                        <span className="pill bg-black/45 text-white backdrop-blur-md inline-flex items-center gap-1">
                          <Sparkles className="h-3 w-3" />
                          AI News Desk
                        </span>
                        <span className="pill bg-black/45 text-white backdrop-blur-md">
                          Beta
                        </span>
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col flex-1 p-5">
                    <h3 className="text-[1.0625rem] font-semibold tracking-[-0.02em] leading-snug mb-2 line-clamp-2">
                      {post.title}
                    </h3>
                    <p className="text-sm leading-relaxed text-muted-foreground line-clamp-2 mb-5">
                      {post.excerpt}
                    </p>
                    <div className="mt-auto flex items-center justify-between pt-4 border-t border-border">
                      <span className="mono-meta text-foreground/65">
                        {post.author} ·{' '}
                        {format(new Date(post.date), 'd MMM yyyy')}
                      </span>
                      <ArrowUpRight className="h-4 w-4 text-foreground/60 transition-all duration-300 group-hover:text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <JoinCta />
    </div>
  );
};

export default HomePage;
