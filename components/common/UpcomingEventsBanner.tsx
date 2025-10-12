'use client'

//TODO: This needs more work on styling to look good.
// Figure out if a rectangular popup is good or if we should have a banner/notification instead?

import React, { useState, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Calendar, Clock, MapPin, X, ChevronRight, EyeOff } from 'lucide-react';
import Link from 'next/link';
import { format, isToday, isTomorrow, isThisWeek } from 'date-fns';

const UpcomingEventsBanner: React.FC = () => {
  const { state } = useApp();
  const [isVisible, setIsVisible] = useState(true);
  const [isDismissed, setIsDismissed] = useState(false);
  const [, setLastEventCount] = useState(0);

  const parseDateTime = (dateStr: string, timeStr?: string, startAt?: string) => {
    if (startAt) return new Date(startAt);
    const t = (timeStr || '00:00').trim();
    const [h, m] = t.split(':');
    const hh = String(h ?? '00').padStart(2, '0');
    const mm = String(m ?? '00').padStart(2, '0');
    return new Date(`${dateStr}T${hh}:${mm}:00`);
  };

  const upcomingEvents = state.events
    .map(e => ({ ...e, _dt: parseDateTime(e.eventStartAt) }))
    .filter(e => {
      const now = new Date();
      const weekFromNow = new Date(now);
      weekFromNow.setDate(now.getDate() + 7);
      return e._dt >= now && e._dt <= weekFromNow;
    })
    .sort((a, b) => a._dt.getTime() - b._dt.getTime())
    .slice(0, 3);

  useEffect(() => {
    const dismissed = window?.localStorage?.getItem('eventBannerDismissed');
    const dismissedTimestamp = window?.localStorage?.getItem('eventBannerDismissedTime');

    if (dismissed === 'true' && dismissedTimestamp) {
      const dismissedTime = parseInt(dismissedTimestamp);
      const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);

      if (dismissedTime > weekAgo) {
        setIsDismissed(true);
        setIsVisible(false);
        return;
      } else {
        window?.localStorage?.removeItem('eventBannerDismissed');
        window?.localStorage?.removeItem('eventBannerDismissedTime');
      }
    }

    const currentEventCount = upcomingEvents.length;
    const storedCount = window?.localStorage?.getItem('lastEventCount');

    if (currentEventCount > 0 && (!dismissed || (storedCount && parseInt(storedCount) < currentEventCount))) {
      setIsVisible(true);
      setIsDismissed(false);
    }

    setLastEventCount(currentEventCount);
    window?.localStorage?.setItem('lastEventCount', currentEventCount.toString());
  }, [upcomingEvents.length]);

  const getEventTimeLabel = (eventDate: Date) => {
    if (isToday(eventDate)) return 'Today';
    if (isTomorrow(eventDate)) return 'Tomorrow';
    if (isThisWeek(eventDate)) return format(eventDate, 'EEEE');
    return format(eventDate, 'MMM dd');
  };

  const handleDismiss = () => setIsVisible(false);
  const handleDontShowAgain = () => {
    window?.localStorage?.setItem('eventBannerDismissed', 'true');
    window?.localStorage?.setItem('eventBannerDismissedTime', Date.now().toString());
    setIsDismissed(true);
    setIsVisible(false);
  };

  if (!isVisible || isDismissed || upcomingEvents.length === 0) return null;

  return (
    <div className="fixed top-20 right-4 z-50 max-w-md min-w-64">
      <Card className="bg-neutral-50 dark:bg-neutral-900 
            border border-neutral-500/50 dark:border-neutral-700 
            rounded-lg shadow-2xl">
        <CardContent className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-sm text-neutral-900 dark:text-neutral-100">
                {upcomingEvents.length === 1 ? 'Upcoming Event' : 'Upcoming Events'}
              </h3>
            </div>
            <div className="flex gap-1">
              <button
                onClick={handleDontShowAgain}
                className="text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200 transition-colors p-1 rounded"
                title="Don't show again for 7 days"
              >
                <EyeOff className="w-4 h-4" />
              </button>
              <button
                onClick={handleDismiss}
                className="text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200 transition-colors p-1 rounded"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Events */}
          <div className="space-y-3">
            {upcomingEvents.map((event) => {
              const eventDate = parseDateTime(event.eventStartAt);
              return (
                <div key={event.id} className="bg-neutral-100 dark:bg-neutral-800 rounded-lg p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-sm mb-1 text-neutral-900 dark:text-neutral-100 line-clamp-2">
                        {event.title}
                      </h4>
                      <div className="space-y-1 text-xs text-neutral-600 dark:text-neutral-400">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>{getEventTimeLabel(eventDate)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{event.eventStartAt}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          <span className="truncate">{event.location}</span>
                        </div>
                      </div>
                    </div>
                    <Link href={`/events/${event.id}`}>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="ml-2 p-2 hover:bg-neutral-200 dark:hover:bg-neutral-700"
                      >
                        <ChevronRight className="w-3 h-3" />
                      </Button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="mt-4 pt-3 border-t border-neutral-200 dark:border-neutral-700">
            <Link href="/events">
              <Button variant="secondary" size="sm" className="w-full">
                View All Events
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UpcomingEventsBanner;
