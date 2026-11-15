'use client';

// The events page's static pieces, shared by the page and its loading skeleton
// (the /events loading boundary), so the skeleton has the page's exact
// geometry. Kept free of the page's data clients: the boundary ships ahead of
// the page.

import React from 'react';
import Link from 'next/link';
import { Calendar, MapPin } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Card, CardContent } from '@/components/ui/Card';
import HeroSplash from '@/components/HeroSplash';
import { isCodexAmbassadorInterviewPublished } from '@/lib/content-publication';
import {
  SkeletonBox,
  SkeletonRegion,
  SkeletonText,
} from '@/components/ui/skeleton';

export const categoryOptions = [
  { value: 'all', label: 'All Categories' },
  { value: 'workshop', label: 'Workshop' },
  { value: 'guest_lecture', label: 'Guest Lecture' },
  { value: 'hackathon', label: 'Hackathon' },
  { value: 'other', label: 'Other' },
];

export const EventsHero = () => (
  <HeroSplash>
    <div className="relative z-10 max-w-7xl mx-auto px-6 sm:px-8 pt-32 pb-20">
      <p className="mono-label text-current/65 mb-6">
        UU AI Society · What&apos;s on
      </p>
      <h1 className="display-lg mb-4">Events</h1>
      <p className="text-base sm:text-lg text-current/60 max-w-2xl leading-relaxed">
        Workshops, guest lectures, and hackathons from the UU AI Society.
      </p>
    </div>
  </HeroSplash>
);

const tabClass = (active: boolean) =>
  `px-4 py-2 rounded text-sm font-medium transition-colors duration-300 ${
    active
      ? 'bg-primary text-primary-foreground'
      : 'text-foreground/60 hover:text-foreground'
  }`;

/** The tabs, search and category filter, with the result count under them. */
export const EventsToolbar: React.FC<{
  activeTab: 'upcoming' | 'past';
  onTabChange: (tab: 'upcoming' | 'past') => void;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  categoryFilter: string;
  onCategoryChange: (value: string) => void;
  summary?: React.ReactNode;
}> = ({
  activeTab,
  onTabChange,
  searchTerm,
  onSearchChange,
  categoryFilter,
  onCategoryChange,
  summary,
}) => (
  <div className="glass rounded-lg p-5 sm:p-6 space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex bg-foreground/[0.05] rounded-md p-1 gap-1">
        <button
          type="button"
          aria-pressed={activeTab === 'upcoming'}
          onClick={() => onTabChange('upcoming')}
          className={tabClass(activeTab === 'upcoming')}
        >
          Upcoming Events
        </button>
        <button
          type="button"
          aria-pressed={activeTab === 'past'}
          onClick={() => onTabChange('past')}
          className={tabClass(activeTab === 'past')}
        >
          Past Events
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center w-full sm:w-auto">
        <div className="sm:w-64">
          <Input
            type="search"
            placeholder="Search events..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            aria-label="Search events"
          />
        </div>
        <div className="sm:w-52">
          <Select
            id="category-filter"
            aria-label="Filter by category"
            options={categoryOptions}
            value={categoryFilter}
            onChange={(e) => onCategoryChange(e.target.value)}
            fullWidth
          />
        </div>
      </div>
    </div>

    {summary && (
      <p className="mono-meta text-muted-foreground" aria-live="polite">
        {summary}
      </p>
    )}
  </div>
);

export const InterviewLink = () => (
  <p className="mt-5 text-sm text-muted-foreground">
    From the community:{' '}
    <Link
      href="/events/codex-ambassador-interview"
      className="text-foreground underline underline-offset-4 decoration-foreground/30 hover:decoration-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
    >
      a conversation with the Codex Ambassador
    </Link>
  </p>
);

export const EVENT_GRID = 'grid md:grid-cols-2 lg:grid-cols-3 gap-5 pt-10';
export const EVENT_CARD = 'h-full flex flex-col overflow-hidden';
export const EVENT_TITLE =
  'text-[1.0625rem] font-semibold tracking-[-0.02em] leading-snug mb-2';
export const EVENT_EXCERPT =
  'text-[0.9375rem] leading-relaxed text-muted-foreground line-clamp-3 whitespace-pre-wrap mb-5';
export const EVENT_META_ROW =
  'flex items-center gap-2 text-sm text-muted-foreground';
export const EVENT_ICON = 'h-4 w-4 shrink-0 text-foreground/40';

/** An event card while it loads: image, title, a short description, date and place, and the button. */
const EventCardSkeleton = () => (
  <Card variant="glass" className={EVENT_CARD} aria-hidden>
    <SkeletonBox className="aspect-[16/10]" />
    <CardContent className="p-5 flex flex-col flex-1">
      <SkeletonText className={EVENT_TITLE} widths={['75%']} />
      {/* Descriptions are cut to 100 characters: three lines at every width. */}
      <SkeletonText className={EVENT_EXCERPT} lines={3} />
      <div className="mt-auto space-y-2 mb-6">
        <div className={EVENT_META_ROW}>
          <Calendar className={EVENT_ICON} />
          <SkeletonText className="mono-meta" widths={['8rem']} />
        </div>
        <div className={EVENT_META_ROW}>
          <MapPin className={EVENT_ICON} />
          <SkeletonText widths={['10rem']} />
        </div>
      </div>
      <SkeletonBox className="h-10 rounded-md" />
    </CardContent>
  </Card>
);

export const EventCardSkeletons: React.FC<{ label: string }> = ({ label }) => (
  <SkeletonRegion label={label} className={EVENT_GRID}>
    <EventCardSkeleton />
    <EventCardSkeleton />
    <EventCardSkeleton />
  </SkeletonRegion>
);

const noop = () => {};

/** The events page while it loads: the real hero, the filters (inert), and placeholder cards. */
export const EventsSkeleton = () => (
  <SkeletonRegion
    label="Loading events…"
    className="min-h-screen bg-background transition-colors pb-24"
  >
    <EventsHero />
    <div className="max-w-7xl mx-auto px-5 sm:px-8 -mt-8">
      <div inert>
        <EventsToolbar
          activeTab="upcoming"
          onTabChange={noop}
          searchTerm=""
          onSearchChange={noop}
          categoryFilter="all"
          onCategoryChange={noop}
          summary={
            <SkeletonText className="inline-block" widths={['4.5rem']} />
          }
        />
      </div>
      {isCodexAmbassadorInterviewPublished() && <InterviewLink />}
      <div aria-hidden className={EVENT_GRID}>
        <EventCardSkeleton />
        <EventCardSkeleton />
        <EventCardSkeleton />
      </div>
    </div>
  </SkeletonRegion>
);
