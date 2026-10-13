import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  addDoc,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  DocumentData,
  onSnapshot,
  limit,
  startAfter,
  QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from '@/lib/firebase-client';
import { Event } from '@/types';
import { stripUndefined } from './utils';
import {
  EVENT_PAGE_SIZE,
  pastEventsUpperBound,
  recentEventsLowerBound,
} from '@/lib/event-pagination';

export type EventPageCursor = QueryDocumentSnapshot<DocumentData>;

export interface PastEventsPage {
  events: Event[];
  cursor: EventPageCursor | null;
  hasMore: boolean;
}

function normalizeEvent(docSnap: {
  id: string;
  data: () => DocumentData;
}): Event {
  const raw = docSnap.data() as Event;
  return {
    id: docSnap.id,
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
  };
}

export const getEvents = async (): Promise<Event[]> => {
  const eventsRef = collection(db, 'events');
  // Only return published events for public (unauthenticated) readers to
  // respect Firestore rules (read allowed when published == true or admin).
  const qy = query(
    eventsRef,
    where('published', '==', true),
    orderBy('eventStartAt', 'desc'),
  );
  const snapshot = await getDocs(qy);
  return snapshot.docs.map(normalizeEvent);
};

export async function getPastEventsPage(options: {
  cursor?: EventPageCursor | null;
  category?: Event['category'] | null;
  asOf: Date;
}): Promise<PastEventsPage> {
  const eventsRef = collection(db, 'events');
  const events: Event[] = [];
  let cursor = options.cursor ?? null;
  let hasMore = true;
  const upperBound = pastEventsUpperBound(options.asOf);

  while (events.length < EVENT_PAGE_SIZE && hasMore) {
    const batchSize = EVENT_PAGE_SIZE - events.length;
    const constraints = [
      where('published', '==', true),
      where('eventStartAt', '<=', upperBound),
      ...(options.category ? [where('category', '==', options.category)] : []),
      orderBy('eventStartAt', 'desc'),
      ...(cursor ? [startAfter(cursor)] : []),
      limit(batchSize),
    ];
    const snapshot = await getDocs(query(eventsRef, ...constraints));
    const docs = snapshot.docs;
    if (docs.length === 0) {
      hasMore = false;
      break;
    }

    cursor = docs[docs.length - 1];
    hasMore = docs.length === batchSize;
    for (const docSnap of docs) {
      const event = normalizeEvent(docSnap);
      const eventTime = new Date(event.eventStartAt).getTime();
      const publishTime = event.publishAt
        ? new Date(event.publishAt).getTime()
        : null;
      if (
        eventTime <= options.asOf.getTime() &&
        (publishTime === null || publishTime <= options.asOf.getTime())
      ) {
        events.push(event);
        if (events.length === EVENT_PAGE_SIZE) break;
      }
    }
  }

  return { events, cursor, hasMore };
}

export const getAllEvents = async (): Promise<Event[]> => getEvents();

export const getEventById = async (id: string): Promise<Event | null> => {
  const eventRef = doc(db, 'events', id);
  const eventSnap = await getDoc(eventRef);
  if (!eventSnap.exists()) return null;
  const raw = eventSnap.data() as Event;

  const normalized: Event = {
    id: eventSnap.id,
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
  };
  return normalized;
};

export const addEvent = async (event: Omit<Event, 'id'>): Promise<string> => {
  const eventsRef = collection(db, 'events');
  const safe = stripUndefined(event) as DocumentData;
  const docRef = await addDoc(eventsRef, safe);
  try {
    const analyticsRef = doc(db, 'analyticsEvents', docRef.id);
    await setDoc(analyticsRef, { clicks: 1, updatedAt: serverTimestamp() });
  } catch (error) {
    console.warn('Failed to initialise analyticsEvents doc', error);
  }
  return docRef.id;
};

export const updateEvent = async (
  id: string,
  event: Partial<Event>,
): Promise<void> => {
  const eventRef = doc(db, 'events', id);
  const patch: Record<string, unknown> = {
    ...(event as Record<string, unknown>),
  };
  delete patch.id;
  const safePatch = stripUndefined(patch) as DocumentData;
  await setDoc(eventRef, safePatch, { merge: true });
};

export const patchEvent = async (
  id: string,
  patch: Partial<Event>,
  removeFields?: string[],
): Promise<void> => {
  const eventRef = doc(db, 'events', id);
  const safe = stripUndefined(patch) as DocumentData;
  const updates: DocumentData = { ...safe };
  if (Array.isArray(removeFields)) {
    for (const field of removeFields) {
      updates[field] = (await import('firebase/firestore')).deleteField();
    }
  }
  await updateDoc(eventRef, updates);
};

export const deleteEvent = async (id: string): Promise<void> => {
  const eventRef = doc(db, 'events', id);
  await deleteDoc(eventRef);
};

export const subscribeToEvents = (
  callback: (events: Event[]) => void,
  options?: { includeUnpublished?: boolean; recentOnly?: boolean },
) => {
  const eventsRef = collection(db, 'events');

  // If includeUnpublished is true (admin), query without the published filter.
  // Otherwise, restrict to published == true so public listeners don't request
  // forbidden documents and trigger permission-denied errors.
  const qy = query(
    eventsRef,
    ...(!options?.includeUnpublished ? [where('published', '==', true)] : []),
    ...(options?.recentOnly
      ? [where('eventStartAt', '>=', recentEventsLowerBound(new Date()))]
      : []),
    orderBy('eventStartAt', 'desc'),
  );

  return onSnapshot(
    qy,
    (snapshot) => {
      const events = snapshot.docs.map((docSnap) => ({
        // @ts-expect-error id is not returned from docSnap.data()
        id: docSnap.id,
        ...(docSnap.data() as Event),
      }));
      callback(events);
    },
    (error) => {
      console.error('Firestore subscription failed:', error);
      callback([]);
    },
  );
};
