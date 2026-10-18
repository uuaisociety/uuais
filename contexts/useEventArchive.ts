'use client';

import { useCallback, useRef, useState } from 'react';
import type { Event } from '@/types';
import type { EventPageCursor } from '@/lib/firestore/events';

export type EventArchiveCategory = 'all' | Event['category'];

export interface EventArchivePage {
  events: Event[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  loaded: boolean;
}

interface StoredPage extends EventArchivePage {
  cursor: EventPageCursor | null;
  inFlight: Promise<void> | null;
}

export interface EventArchive {
  pages: Partial<Record<EventArchiveCategory, EventArchivePage>>;
  searchEvents: Event[] | null;
  searchLoading: boolean;
  searchError: string | null;
  loadMore: (category: EventArchiveCategory) => Promise<void>;
  ensureSearchEvents: () => Promise<Event[] | null>;
}

const emptyPage = (): StoredPage => ({
  events: [],
  cursor: null,
  loading: false,
  error: null,
  hasMore: true,
  loaded: false,
  inFlight: null,
});

export function useEventArchive(): EventArchive {
  const [asOf] = useState(() => new Date());
  const pagesRef = useRef<Partial<Record<EventArchiveCategory, StoredPage>>>(
    {},
  );
  const [pages, setPages] = useState<
    Partial<Record<EventArchiveCategory, EventArchivePage>>
  >({});
  const searchEventsRef = useRef<Event[] | null>(null);
  const searchRequestRef = useRef<Promise<Event[] | null> | null>(null);
  const [searchEvents, setSearchEvents] = useState<Event[] | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const loadMore = useCallback(
    (category: EventArchiveCategory) => {
      const current = pagesRef.current[category] ?? emptyPage();
      if (current.inFlight) return current.inFlight;
      if (current.loaded && !current.hasMore) return Promise.resolve();

      const pending: StoredPage = {
        ...current,
        loading: true,
        error: null,
        inFlight: null,
      };
      pagesRef.current[category] = pending;
      setPages((previous) => ({ ...previous, [category]: { ...pending } }));
      const request = import('@/lib/firestore/events')
        .then(({ getPastEventsPage }) =>
          getPastEventsPage({
            cursor: current.cursor,
            category: category === 'all' ? null : category,
            asOf,
          }),
        )
        .then((page) => {
          const next: StoredPage = {
            events: [...current.events, ...page.events],
            cursor: page.cursor,
            hasMore: page.hasMore,
            loading: false,
            error: null,
            loaded: true,
            inFlight: null,
          };
          pagesRef.current[category] = next;
          setPages((previous) => ({ ...previous, [category]: next }));
        })
        .catch((error: unknown) => {
          const failed: StoredPage = {
            ...current,
            loading: false,
            error:
              error instanceof Error
                ? error.message
                : 'Could not load past events.',
            inFlight: null,
          };
          pagesRef.current[category] = failed;
          setPages((previous) => ({ ...previous, [category]: failed }));
        });
      pending.inFlight = request;
      return request;
    },
    [asOf],
  );

  const ensureSearchEvents = useCallback(() => {
    if (searchEventsRef.current)
      return Promise.resolve(searchEventsRef.current);
    if (searchRequestRef.current) return searchRequestRef.current;
    setSearchLoading(true);
    setSearchError(null);
    const request = import('@/lib/firestore/events')
      .then(({ getEvents }) => getEvents())
      .then((events) => {
        searchEventsRef.current = events;
        setSearchEvents(events);
        return events;
      })
      .catch((error: unknown) => {
        setSearchError(
          error instanceof Error ? error.message : 'Could not search events.',
        );
        return null;
      })
      .finally(() => {
        if (searchRequestRef.current === request)
          searchRequestRef.current = null;
        setSearchLoading(false);
      });
    searchRequestRef.current = request;
    return request;
  }, []);

  return {
    pages,
    searchEvents,
    searchLoading,
    searchError,
    loadMore,
    ensureSearchEvents,
  };
}
