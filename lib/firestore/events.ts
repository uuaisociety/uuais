import {
  collection,
  query,
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
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase-client";
import { Event } from "@/types";
import { stripUndefined } from "./utils";

export const getEvents = async (): Promise<Event[]> => {
  const eventsRef = collection(db, "events");
  const qy = query(eventsRef, orderBy("eventStartAt", "desc"));
  const snapshot = await getDocs(qy);
  return snapshot.docs.map((docSnap) => {
    const raw = docSnap.data() as Event;
    const normalized: Event = {
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
    };
    return normalized;
  });
};

export const getAllEvents = async (): Promise<Event[]> => getEvents();

export const getEventById = async (id: string): Promise<Event | null> => {
  const eventRef = doc(db, "events", id);
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
  };
  return normalized;
};

export const addEvent = async (event: Omit<Event, "id">): Promise<string> => {
  const eventsRef = collection(db, "events");
  const safe = stripUndefined(event) as DocumentData;
  const docRef = await addDoc(eventsRef, safe);
  try {
    const analyticsRef = doc(db, "analyticsEvents", docRef.id);
    await setDoc(analyticsRef, { clicks: 1, updatedAt: serverTimestamp() });
  } catch (error) {
    console.warn("Failed to initialise analyticsEvents doc", error);
  }
  return docRef.id;
};

export const updateEvent = async (
  id: string,
  event: Partial<Event>
): Promise<void> => {
  const eventRef = doc(db, "events", id);
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
  removeFields?: string[]
): Promise<void> => {
  const eventRef = doc(db, "events", id);
  const safe = stripUndefined(patch) as DocumentData;
  const updates: DocumentData = { ...safe };
  if (Array.isArray(removeFields)) {
    for (const field of removeFields) {
      updates[field] = (await import("firebase/firestore")).deleteField();
    }
  }
  await updateDoc(eventRef, updates);
};

export const deleteEvent = async (id: string): Promise<void> => {
  const eventRef = doc(db, "events", id);
  await deleteDoc(eventRef);
};

export const subscribeToEvents = (callback: (events: Event[]) => void) => {
  const eventsRef = collection(db, "events");

  // Only getting published events is handled by firestore.rules
  const qy = query(
    eventsRef,
    orderBy("eventStartAt", "desc")
  );

  return onSnapshot(qy, (snapshot) => {
    const events = snapshot.docs.map((docSnap) => ({
      // @ts-expect-error id is not returned from docSnap.data()
      id: docSnap.id,
      ...(docSnap.data() as Event),
    }));
    callback(events);
  });
};
