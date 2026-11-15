import React from 'react';
// Plain dompurify needs a DOM, so on the server it would return its input unchanged.
import DOMPurify from 'isomorphic-dompurify';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Tag as UiTag } from '@/components/ui/Tag';
import { Calendar, Clock, MapPin, Tag } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { format } from 'date-fns';
import { SITE_URL } from '@/app/metadata';

import campus from '@/public/images/campus.png';
import EventDetailClient from '@/components/events/EventDetailClient';
import {
  BackToEvents,
  EVENT_ABOUT_CONTENT_CLASS,
  EVENT_ABOUT_HEADING_CLASS,
  EVENT_COLUMN_CLASS,
  EVENT_FACT_CLASS,
  EVENT_FACTS_CLASS,
  EVENT_IMAGE_CLASS,
  EVENT_PAGE_CLASS,
  EVENT_SECTION_CARD_CLASS,
  EVENT_TITLE_CLASS,
} from '@/components/events/EventDetailLayout';
import FormattedText from '@/components/ui/FormattedText';
import {
  getEventByIdServer,
  getRelatedEventsServer,
} from '@/lib/server-events';

const categoryOptions = [
  { value: 'all', label: 'All Categories' },
  { value: 'workshop', label: 'Workshop' },
  { value: 'guest_lecture', label: 'Guest Lecture' },
  { value: 'hackathon', label: 'Hackathon' },
  { value: 'other', label: 'Other' },
];

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  if (!id) return { title: 'Event' };
  const event = await getEventByIdServer(id);
  if (!event) return { title: 'Event' };
  return {
    title: event.title,
    description: event.description?.slice(0, 160) || '',
    alternates: { canonical: `${SITE_URL}/events/${id}` },
  };
}

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const event = await getEventByIdServer(id);
  if (!event) {
    notFound();
  }

  const related = await getRelatedEventsServer(id, 2);

  const eventStart = new Date(event.eventStartAt);
  const now = new Date();
  const isUpcoming = eventStart > now;
  const isPastEvent = eventStart < now;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.title,
    startDate: event.eventStartAt,
    location: { '@type': 'Place', name: event.location },
    description: event.description,
    eventAttendanceMode: event.registrationRequired
      ? 'https://schema.org/OfflineEventAttendanceMode'
      : undefined,
    image: event.image,
    organizer: {
      '@type': 'Organization',
      name: 'UU AI Society',
      url: SITE_URL,
    },
  };

  return (
    <div className={EVENT_PAGE_CLASS}>
      <div className={EVENT_COLUMN_CLASS}>
        <script
          type="application/ld+json"
          // Escaped so a `</script>` in the description can't end this tag.
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c'),
          }}
        />

        {/* Back Button */}
        <BackToEvents />

        {/* Event Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between mb-4">
            <h1 className={EVENT_TITLE_CLASS}>{event.title}</h1>
            {isUpcoming || !isPastEvent ? (
              <UiTag variant="red">{isUpcoming ? 'Upcoming' : 'Today'}</UiTag>
            ) : (
              <UiTag variant="gray">Past Event</UiTag>
            )}
          </div>

          <div className={EVENT_FACTS_CLASS}>
            <div className={EVENT_FACT_CLASS}>
              <Calendar className="w-5 h-5" />
              <span>
                {format(new Date(event.eventStartAt), 'EEEE, MMMM dd, yyyy')}
              </span>
            </div>
            <div className={EVENT_FACT_CLASS}>
              <Clock className="w-5 h-5" />
              <span>{format(new Date(event.eventStartAt), 'HH:mm')}</span>
            </div>
            <div className={EVENT_FACT_CLASS}>
              <MapPin className="w-5 h-5" />
              <span>{event.location}</span>
            </div>
            {event.category && (
              <div className={EVENT_FACT_CLASS}>
                <Tag className="w-5 h-5" />
                <span>
                  {categoryOptions.find(
                    (option) => option.value === event.category?.toLowerCase(),
                  )?.label ||
                    event.category
                      .replace(/_/g, ' ')
                      .replace(/\b\w/g, (c) => c.toUpperCase())}
                </span>
              </div>
            )}
          </div>

          {/* Interactive registration / external-reg / QR blocks */}
          <EventDetailClient event={event} relatedEvents={related} />
        </div>

        {/* Featured Image */}
        {event.image && (
          <div className="mb-8">
            <Image
              src={event.image || campus}
              alt={event.title}
              width={800}
              height={400}
              fetchPriority="high"
              className={EVENT_IMAGE_CLASS}
            />
          </div>
        )}

        {/* Event Description */}
        <Card className={EVENT_SECTION_CARD_CLASS}>
          <CardContent className={EVENT_ABOUT_CONTENT_CLASS}>
            <h2 className={EVENT_ABOUT_HEADING_CLASS}>About This Event</h2>
            {/<\/?[a-z][\s\S]*>/i.test(event.description || '') ? (
              <div
                className="prose prose-lg max-w-none dark:prose-invert prose-headings:text-foreground prose-p:text-muted-foreground"
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(event.description || ''),
                }}
              />
            ) : (
              <FormattedText
                text={event.description || ''}
                className="max-w-none text-lg leading-relaxed text-muted-foreground"
              />
            )}
          </CardContent>
        </Card>

        {/* Event Details */}
        <div className="grid md:grid-cols-2 gap-8 mt-8">
          <Card className="h-full bg-card pt-4">
            <CardContent className="pt-4">
              <h3 className="text-xl font-bold text-foreground mb-4">
                Event Details
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date:</span>
                  <span className="text-foreground font-medium">
                    {format(new Date(event.eventStartAt), 'MMM dd, yyyy')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Time:</span>
                  <span className="text-foreground font-medium">
                    {format(new Date(event.eventStartAt), 'HH:mm')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Location:</span>
                  <span className="text-foreground font-medium text-right">
                    {event.location}
                  </span>
                </div>
                {event.category && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Category:</span>
                    <span className="text-foreground font-medium">
                      {categoryOptions.find(
                        (option) =>
                          option.value === event.category?.toLowerCase(),
                      )?.label ||
                        event.category
                          .replace(/_/g, ' ')
                          .replace(/\b\w/g, (c) => c.toUpperCase())}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {event.registrationRequired && (
            <Card className="h-full bg-card pt-4">
              <CardContent className="pt-4">
                <h3 className="text-xl font-bold text-foreground mb-4">
                  Registration
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Capacity:</span>
                    <span className="text-foreground font-medium">
                      {event.maxCapacity || 'TBA'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Related Events */}
        {related.length > 0 && (
          <div className="mt-12 ">
            <h3 className="text-2xl font-bold text-foreground mb-6">
              Other Upcoming Events
            </h3>
            <div className="grid md:grid-cols-2 gap-6 ">
              {related.map((relatedEvent) => (
                <Card
                  key={relatedEvent.id}
                  variant="default"
                  hover
                  className="bg-card pt-4"
                >
                  <CardContent className="pt-4">
                    {relatedEvent.image && (
                      <Image
                        src={relatedEvent.image || campus}
                        alt={relatedEvent.title}
                        width={300}
                        height={200}
                        className="w-full h-32 object-cover rounded-lg mb-4"
                      />
                    )}
                    <h4 className="text-lg font-semibold text-foreground mb-2">
                      {relatedEvent.title}
                    </h4>
                    <div className="text-muted-foreground text-sm mb-4 space-y-1">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>
                          {format(
                            new Date(relatedEvent.eventStartAt),
                            'MMM dd, yyyy',
                          )}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        <span>{relatedEvent.location}</span>
                      </div>
                    </div>
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/events/${relatedEvent.id}`}>
                        View Details
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
