// Shared by the event page and its loading skeleton, so the skeleton has the
// page's exact geometry. No 'use client': the page is a server component and
// reads these class strings directly.

import Link from 'next/link';
import { ArrowLeft, Calendar, Clock, MapPin, Tag } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import {
  SkeletonBox,
  SkeletonRegion,
  SkeletonText,
} from '@/components/ui/skeleton';

export const EVENT_PAGE_CLASS = 'min-h-screen bg-background py-12 pt-24';
export const EVENT_COLUMN_CLASS = 'max-w-4xl mx-auto px-4 sm:px-6 lg:px-8';
export const EVENT_TITLE_CLASS = 'text-4xl font-bold text-foreground';
export const EVENT_FACTS_CLASS =
  'grid md:grid-cols-2 gap-4 text-muted-foreground mb-6';
export const EVENT_FACT_CLASS = 'flex items-center gap-2';
const EVENT_IMAGE_BOX_CLASS = 'w-full h-64 sm:h-80 md:h-96 rounded-lg';
export const EVENT_IMAGE_CLASS = `${EVENT_IMAGE_BOX_CLASS} object-cover shadow-lg`;
export const EVENT_SECTION_CARD_CLASS = 'h-full bg-card pt-4';
export const EVENT_ABOUT_CONTENT_CLASS = 'pt-4 pb-6 pl-6 pr-6';
export const EVENT_ABOUT_HEADING_CLASS =
  'text-2xl font-bold text-foreground mb-4';

export const BackToEvents = () => (
  <Button asChild variant="outline" className="mb-8" icon={ArrowLeft}>
    <Link href="/events">Back to Events</Link>
  </Button>
);

/** An event page while it loads: the back link, title, the four facts, the image and the description. */
export const EventDetailSkeleton = () => (
  <SkeletonRegion label="Loading event…" className={EVENT_PAGE_CLASS}>
    <div className={EVENT_COLUMN_CLASS}>
      <BackToEvents />

      <div className="mb-8">
        <div className="flex items-start justify-between gap-4 mb-4">
          {/* At text-4xl beside the tag, a title takes two lines on a phone. */}
          <div className={`${EVENT_TITLE_CLASS} flex-1`}>
            <SkeletonText widths={['70%']} />
            <SkeletonText className="sm:hidden" widths={['45%']} />
          </div>
          <SkeletonBox className="h-6 w-20 rounded-sm" />
        </div>
        <div className={EVENT_FACTS_CLASS}>
          {[Calendar, Clock, MapPin, Tag].map((Icon, i) => (
            <div key={i} className={EVENT_FACT_CLASS}>
              <Icon className="w-5 h-5" />
              <SkeletonText widths={[i === 1 ? '3rem' : '11rem']} />
            </div>
          ))}
        </div>
      </div>

      <div className="mb-8">
        <SkeletonBox className={EVENT_IMAGE_BOX_CLASS} />
      </div>

      <Card className={EVENT_SECTION_CARD_CLASS}>
        <CardContent className={EVENT_ABOUT_CONTENT_CLASS}>
          <h2 className={EVENT_ABOUT_HEADING_CLASS}>About This Event</h2>
          <SkeletonText className="text-lg leading-relaxed" lines={4} />
        </CardContent>
      </Card>
    </div>
  </SkeletonRegion>
);
