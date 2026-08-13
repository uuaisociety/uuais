import { adminDb } from '@/lib/firebase-admin';
import { DocumentData } from 'firebase-admin/firestore';
import { Event } from '@/types';

// Mirrors the normalization in lib/firestore/events.ts:57-82 so server-rendered
// events have the same shape as client-fetched ones.
function normalizeEvent(id: string, raw: DocumentData): Event | null {
  if (!raw.title || !raw.eventStartAt) return null;
  return {
    id,
    title: raw.title,
    description: raw.description,
    location: raw.location,
    image: raw.image,
    category: raw.category,
    status: raw.status,
    registrationRequired: !!raw.registrationRequired,
    currentRegistrations: raw.currentRegistrations,
    maxCapacity: raw.maxCapacity,
    published: raw.published,
    eventStartAt: raw.eventStartAt,
    registrationClosesAt: raw.registrationClosesAt,
    publishAt: raw.publishAt,
    externalRegistrationUrl: raw.externalRegistrationUrl,
    externalRegistrationMembersOnly: !!raw.externalRegistrationMembersOnly,
  } as Event;
}

export async function getEventByIdServer(id: string): Promise<Event | null> {
  try {
    const eventSnap = await adminDb.collection('events').doc(id).get();
    if (!eventSnap.exists) return null;
    const raw = eventSnap.data();
    // Match public client behavior: unpublished/draft events are not visible.
    if (!raw || raw.published !== true) return null;
    return normalizeEvent(eventSnap.id, raw);
  } catch {
    return null;
  }
}

export async function getRelatedEventsServer(
  id: string,
  relatedLimit = 2
): Promise<Event[]> {
  try {
    const now = Date.now();
    const snapshot = await adminDb
      .collection('events')
      .where('published', '==', true)
      .orderBy('eventStartAt', 'desc')
      .limit(20)
      .get();
    const upcoming = snapshot.docs
      .map((d) => normalizeEvent(d.id, d.data()))
      .filter(
        (e): e is Event =>
          e !== null && e.id !== id && new Date(e.eventStartAt).getTime() > now
      );
    return upcoming.slice(0, relatedLimit);
  } catch {
    return [];
  }
}
