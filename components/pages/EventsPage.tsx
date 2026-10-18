'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Calendar, MapPin, Users } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Card, CardContent } from '@/components/ui/Card';
import HeroSplash from '@/components/HeroSplash';
import { useApp } from '@/contexts/AppContext';
import { updatePageMeta } from '@/utils/seo';
import { format } from 'date-fns';
import Image from 'next/image';
import Link from 'next/link';
import campus from '@/public/images/campus.png';
import type { Event } from '@/types';
import type { EventArchiveCategory } from '@/contexts/useEventArchive';
import { EVENT_PAGE_SIZE as PAST_EVENTS_PAGE_SIZE } from '@/lib/event-pagination';

const EventsPage: React.FC = () => {
  const { state, eventArchive } = useApp();
  const { pages, loadMore, ensureSearchEvents } = eventArchive;
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [visiblePastCount, setVisiblePastCount] = useState(
    PAST_EVENTS_PAGE_SIZE,
  );

  useEffect(() => {
    updatePageMeta(
      'Events',
      'Join our upcoming AI workshops, guest lectures, and networking events',
    );
  }, []);

  const categoryOptions = [
    { value: 'all', label: 'All Categories' },
    { value: 'workshop', label: 'Workshop' },
    { value: 'guest_lecture', label: 'Guest Lecture' },
    { value: 'hackathon', label: 'Hackathon' },
    { value: 'other', label: 'Other' },
  ];

  const now = useMemo(() => new Date(), []);
  const searching = searchTerm.trim().length > 0;
  const archiveCategory =
    categoryFilter === 'all' ? 'all' : (categoryFilter as EventArchiveCategory);
  const archivePage = pages[archiveCategory];

  useEffect(() => {
    if (searching) void ensureSearchEvents();
  }, [searching, ensureSearchEvents]);

  useEffect(() => {
    if (activeTab !== 'past' || searching) return;
    const page = pages[archiveCategory];
    if (
      (!page && visiblePastCount > 0) ||
      (page &&
        !page.loading &&
        !page.error &&
        page.hasMore &&
        page.events.length < visiblePastCount)
    ) {
      void loadMore(archiveCategory);
    }
  }, [
    activeTab,
    searching,
    archiveCategory,
    visiblePastCount,
    pages,
    loadMore,
  ]);

  const matchesTextAndCategory = useCallback(
    (event: Event) => {
      const matchesSearch =
        event.title.toLowerCase().includes(searchTerm.trim().toLowerCase()) ||
        event.description
          .toLowerCase()
          .includes(searchTerm.trim().toLowerCase());
      const matchesCategory =
        categoryFilter === 'all' || event.category === categoryFilter;
      return matchesSearch && matchesCategory;
    },
    [searchTerm, categoryFilter],
  );

  const futureEvents = useMemo(
    () =>
      (searching ? (eventArchive.searchEvents ?? []) : state.events)
        .filter((event) => event.published !== false)
        .filter((event) => !event.publishAt || new Date(event.publishAt) <= now)
        .filter((event) => new Date(event.eventStartAt) > now)
        .filter(matchesTextAndCategory),
    [
      state.events,
      eventArchive.searchEvents,
      searching,
      matchesTextAndCategory,
      now,
    ],
  );

  const pastEvents = useMemo(
    () =>
      (searching
        ? (eventArchive.searchEvents ?? [])
        : (archivePage?.events ?? [])
      )
        .filter((e) => e.published !== false)
        .filter((e) => !e.publishAt || new Date(e.publishAt) <= now)
        .filter((e) => new Date(e.eventStartAt) < now)
        .filter(matchesTextAndCategory)
        .sort((a, b) => {
          const dateDifference =
            new Date(b.eventStartAt).getTime() -
            new Date(a.eventStartAt).getTime();
          return dateDifference || a.id.localeCompare(b.id);
        }),
    [
      searching,
      eventArchive.searchEvents,
      archivePage?.events,
      matchesTextAndCategory,
      now,
    ],
  );

  const formatCategoryLabel = (category: string) => {
    const option = categoryOptions.find(
      (o) => o.value === category.toLowerCase(),
    );
    return (
      option?.label ||
      category.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    );
  };

  const activeEvents =
    activeTab === 'upcoming'
      ? futureEvents
      : pastEvents.slice(0, visiblePastCount);
  const activeLoading = searching
    ? eventArchive.searchLoading ||
      (!eventArchive.searchEvents && !eventArchive.searchError)
    : activeTab === 'past' &&
      (archivePage?.loading || (!archivePage?.loaded && !archivePage?.error));
  const activeError = searching
    ? eventArchive.searchError
    : activeTab === 'past'
      ? archivePage?.error
      : null;

  const changeTab = (tab: 'upcoming' | 'past') => {
    setActiveTab(tab);
    setVisiblePastCount(PAST_EVENTS_PAGE_SIZE);
  };

  const changeSearchTerm = (value: string) => {
    setSearchTerm(value);
    setVisiblePastCount(PAST_EVENTS_PAGE_SIZE);
  };

  const changeCategoryFilter = (value: string) => {
    setCategoryFilter(value);
    setVisiblePastCount(PAST_EVENTS_PAGE_SIZE);
  };

  return (
    <div className="min-h-screen bg-background transition-colors pb-24">
      {/* Hero */}
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

      <div className="max-w-7xl mx-auto px-5 sm:px-8 -mt-8">
        {/* Tabs + filters */}
        <div className="glass rounded-lg p-5 sm:p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex bg-foreground/[0.05] rounded-md p-1 gap-1">
              <button
                type="button"
                aria-pressed={activeTab === 'upcoming'}
                onClick={() => changeTab('upcoming')}
                className={`px-4 py-2 rounded text-sm font-medium transition-colors duration-300 ${
                  activeTab === 'upcoming'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-foreground/60 hover:text-foreground'
                }`}
              >
                Upcoming Events
              </button>
              <button
                type="button"
                aria-pressed={activeTab === 'past'}
                onClick={() => changeTab('past')}
                className={`px-4 py-2 rounded text-sm font-medium transition-colors duration-300 ${
                  activeTab === 'past'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-foreground/60 hover:text-foreground'
                }`}
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
                  onChange={(e) => changeSearchTerm(e.target.value)}
                  aria-label="Search events"
                />
              </div>
              <div className="sm:w-52">
                <Select
                  id="category-filter"
                  aria-label="Filter by category"
                  options={categoryOptions}
                  value={categoryFilter}
                  onChange={(e) => changeCategoryFilter(e.target.value)}
                  fullWidth
                />
              </div>
            </div>
          </div>

          {((activeTab === 'past' &&
            (!searching || !!eventArchive.searchEvents)) ||
            (state.eventsLoaded && activeEvents.length > 0)) && (
            <p className="mono-meta text-muted-foreground" aria-live="polite">
              {activeTab === 'past' && searching
                ? `Showing ${activeEvents.length} of ${pastEvents.length} events`
                : activeTab === 'past' && archivePage?.hasMore
                  ? `Showing ${activeEvents.length} past events`
                  : activeTab === 'past'
                    ? `Showing ${activeEvents.length} of ${pastEvents.length} events`
                    : `${activeEvents.length} event${activeEvents.length !== 1 ? 's' : ''}`}
            </p>
          )}
        </div>

        <p className="mt-5 text-sm text-muted-foreground">
          From the community:{' '}
          <Link
            href="/events/codex-ambassador-interview"
            className="text-foreground underline underline-offset-4 decoration-foreground/30 hover:decoration-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
          >
            a conversation with the Codex Ambassador
          </Link>
        </p>

        {/* Events Grid */}
        {!searching && !state.eventsLoaded && activeTab === 'upcoming' ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 pt-10">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} variant="glass" className="overflow-hidden">
                <div className="aspect-[16/10] bg-foreground/5 animate-pulse" />
                <div className="p-5 space-y-3">
                  <div className="h-4 w-3/4 rounded bg-foreground/10 animate-pulse" />
                  <div className="h-3 w-full rounded bg-foreground/5 animate-pulse" />
                  <div className="h-3 w-2/3 rounded bg-foreground/5 animate-pulse" />
                </div>
              </Card>
            ))}
          </div>
        ) : activeError && activeEvents.length === 0 ? (
          <div
            className="border-t border-border py-12 text-center mt-10"
            role="alert"
          >
            <p className="text-muted-foreground mb-4">
              {searching
                ? 'Could not search events.'
                : 'Could not load past events.'}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                searching
                  ? void eventArchive.ensureSearchEvents()
                  : void eventArchive.loadMore(archiveCategory)
              }
            >
              {searching ? 'Retry search' : 'Retry loading events'}
            </Button>
          </div>
        ) : activeLoading && activeEvents.length === 0 ? (
          <p className="py-12 text-center text-muted-foreground" role="status">
            {searching ? 'Searching events...' : 'Loading past events...'}
          </p>
        ) : activeEvents.length === 0 ? (
          <div className="border-t border-border py-16 text-center mt-10">
            <Calendar className="h-12 w-12 text-foreground/60 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-foreground mb-2">
              No events found
            </h2>
            <p className="text-muted-foreground">
              {activeTab === 'upcoming'
                ? 'No upcoming events match your search criteria.'
                : 'No past events match your search criteria.'}
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 pt-10">
            {activeEvents.map((event) => (
              <Card
                key={event.id}
                variant="glass"
                hover
                className="h-full flex flex-col overflow-hidden group"
              >
                <div className="relative aspect-[16/10] overflow-hidden">
                  <Link href={`/events/${event.id}`} aria-label={event.title}>
                    <Image
                      src={event.image || campus}
                      alt=""
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:scale-[1.04]"
                      loading={activeEvents[0] === event ? 'eager' : 'lazy'}
                      fetchPriority={
                        activeEvents[0] === event ? 'high' : 'auto'
                      }
                    />
                  </Link>
                  <span className="absolute top-3 left-3 pill bg-black/45 text-white backdrop-blur-md">
                    {formatCategoryLabel(event.category)}
                  </span>
                  {event.registrationRequired && activeTab === 'upcoming' && (
                    <span className="absolute top-3 right-3 pill bg-black/45 text-white backdrop-blur-md">
                      Registration Required
                    </span>
                  )}
                </div>

                <CardContent className="p-5 flex flex-col flex-1">
                  <h2 className="text-[1.0625rem] font-semibold tracking-[-0.02em] leading-snug mb-2">
                    <Link
                      href={`/events/${event.id}`}
                      className="text-foreground hover:text-primary transition-colors duration-300"
                    >
                      {event.title}
                    </Link>
                  </h2>

                  <p className="text-[0.9375rem] leading-relaxed text-muted-foreground line-clamp-3 whitespace-pre-wrap mb-5">
                    {event.description.slice(0, 100) +
                      (event.description.length > 100 ? '...' : '')}
                  </p>

                  <div className="mt-auto space-y-2 mb-6">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4 shrink-0 text-foreground/40" />
                      <span className="mono-meta">
                        {format(new Date(event.eventStartAt), 'MMM d, yyyy')} ·{' '}
                        {format(new Date(event.eventStartAt), 'HH:mm')}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4 shrink-0 text-foreground/40" />
                      <span>{event.location}</span>
                    </div>

                    {typeof event.maxCapacity === 'number' && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="h-4 w-4 shrink-0 text-foreground/40" />
                        <span>Capacity: {event.maxCapacity}</span>
                      </div>
                    )}
                  </div>

                  <Button
                    asChild
                    variant={activeTab === 'upcoming' ? 'cta' : 'outline'}
                  >
                    <Link href={`/events/${event.id}`}>
                      {activeTab === 'upcoming'
                        ? 'View Details & Register'
                        : 'View Details'}
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        {activeError && activeEvents.length > 0 && (
          <div
            className="flex flex-wrap items-center justify-center gap-3 mt-6"
            role="alert"
          >
            <p className="text-sm text-muted-foreground">
              {searching
                ? 'Could not search events.'
                : 'Could not load more past events.'}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                void (searching
                  ? eventArchive.ensureSearchEvents()
                  : eventArchive.loadMore(archiveCategory))
              }
            >
              Retry loading events
            </Button>
          </div>
        )}
        {activeTab === 'past' &&
          pastEvents.length > 0 &&
          ((searching && activeEvents.length < pastEvents.length) ||
            (!searching &&
              (activeEvents.length < pastEvents.length ||
                archivePage?.hasMore))) && (
            <div className="flex justify-center mt-8">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={activeLoading}
                onClick={() =>
                  setVisiblePastCount((count) => count + PAST_EVENTS_PAGE_SIZE)
                }
              >
                {activeLoading ? 'Loading events...' : 'Load events'}
              </Button>
            </div>
          )}
      </div>
    </div>
  );
};

export default EventsPage;
