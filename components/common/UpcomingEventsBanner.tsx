'use client'

import React, { useState, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Calendar, Clock, MapPin, X, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { format, isToday, isTomorrow, isThisWeek } from 'date-fns';

const UpcomingEventsBanner: React.FC = () => {
  const { state } = useApp();
  const [isVisible, setIsVisible] = useState(true);
  const [, setLastEventCount] = useState(0);

  // Get upcoming events (next 7 days)
  const upcomingEvents = state.events
    .filter(event => {
      const eventDate = new Date(event.date);
      const now = new Date();
      const weekFromNow = new Date();
      weekFromNow.setDate(now.getDate() + 7);
      return eventDate >= now && eventDate <= weekFromNow;
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 3); // Show max 3 events

  // Check for new events
  useEffect(() => {
    const currentEventCount = upcomingEvents.length;
    const storedCount = localStorage.getItem('lastEventCount');
    
    if (storedCount && parseInt(storedCount) < currentEventCount) {
      setIsVisible(true);
    }
    
    setLastEventCount(currentEventCount);
    localStorage.setItem('lastEventCount', currentEventCount.toString());
  }, [upcomingEvents.length]);

  const getEventTimeLabel = (eventDate: Date) => {
    if (isToday(eventDate)) return 'Today';
    if (isTomorrow(eventDate)) return 'Tomorrow';
    if (isThisWeek(eventDate)) return format(eventDate, 'EEEE');
    return format(eventDate, 'MMM dd');
  };

  if (!isVisible || upcomingEvents.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-20 right-4 z-50 max-w-sm min-w-64">
      <Card className="bg-gradient-to-r from-blue-600 to-purple-600 pt-4 text-white shadow-xl border-0">
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              <h3 className="font-semibold">
                {upcomingEvents.length === 1 ? 'Upcoming Event' : 'Upcoming Events'}
              </h3>
            </div>
            <button
              onClick={() => setIsVisible(false)}
              className="text-white/80 absolute top-0 right-0 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3">
            {upcomingEvents.map((event) => {
              const eventDate = new Date(event.date);
              return (
                <div key={event.id} className="bg-white/10 rounded-lg p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-sm mb-1 line-clamp-2">
                        {event.title}
                      </h4>
                      <div className="space-y-1 text-xs text-white/80">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>{getEventTimeLabel(eventDate)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{event.time}</span>
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
                        variant="outline"
                        className="ml-2 bg-white/20 border-white/30 text-white hover:bg-white/30"
                      >
                        <ChevronRight className="w-3 h-3" />
                      </Button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 pt-3 border-t border-white/20">
            <Link href="/events">
              <Button
                variant="outline"
                size="sm"
                className="w-full bg-white/20 border-white/30 text-white hover:bg-white/30"
              >
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
