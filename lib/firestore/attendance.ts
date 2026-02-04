import { db } from '@/lib/firebase-client';
import {
  doc,
  getDoc,
  runTransaction,
  onSnapshot,
  DocumentData,
} from 'firebase/firestore';

export type EventAttendanceEntry = {
  userId: string;
  attended: boolean | null;
  timestamp: number | null;
};

export type UserEventHistoryEntry = {
  eventId: string;
  attended: boolean | null;
};

export async function getEventAttendance(eventId: string): Promise<EventAttendanceEntry[]> {
  if (!eventId) return [];
  const ref = doc(db, 'events', eventId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return [];
  const data = snap.data() as DocumentData;
  const attendees = Array.isArray(data.attendees) ? (data.attendees as EventAttendanceEntry[]) : [];
  return attendees;
}

export const subscribeToEventAttendance = (
  eventId: string,
  callback: (entries: EventAttendanceEntry[]) => void,
) => {
  if (!eventId) return () => {};
  const ref = doc(db, 'events', eventId);
  return onSnapshot(ref, (snap) => {
    if (!snap.exists()) {
      callback([]);
      return;
    }
    const data = snap.data() as DocumentData;
    const attendees = Array.isArray(data.attendees) ? (data.attendees as EventAttendanceEntry[]) : [];
    callback(attendees);
  });
};

export async function setAttendanceForUser(
  eventId: string,
  userId: string,
  attended: boolean | null,
): Promise<void> {
  if (!eventId || !userId) return;

  const eventRef = doc(db, 'events', eventId);
  const userRef = doc(db, 'users', userId);

  await runTransaction(db, async (tx) => {
    const [eventSnap, userSnap] = await Promise.all([
      tx.get(eventRef),
      tx.get(userRef),
    ]);

    const eventData = (eventSnap.exists() ? (eventSnap.data() as DocumentData) : {}) as DocumentData;
    const userData = (userSnap.exists() ? (userSnap.data() as DocumentData) : {}) as DocumentData;

    const attendees: EventAttendanceEntry[] = Array.isArray(eventData.attendees)
      ? (eventData.attendees as EventAttendanceEntry[])
      : [];
    const eventHistory: UserEventHistoryEntry[] = Array.isArray(userData.eventHistory)
      ? (userData.eventHistory as UserEventHistoryEntry[])
      : [];

    const nowTs = attended ? Date.now() : null;

    const nextAttendees = (() => {
      const idx = attendees.findIndex((a) => a.userId === userId);
      if (idx === -1) {
        return attendees.concat({ userId, attended, timestamp: nowTs });
      }
      const copy = attendees.slice();
      copy[idx] = { ...copy[idx], attended, timestamp: nowTs };
      return copy;
    })();

    const nextHistory = (() => {
      const idx = eventHistory.findIndex((h) => h.eventId === eventId);
      if (idx === -1) {
        return eventHistory.concat({ eventId, attended });
      }
      const copy = eventHistory.slice();
      copy[idx] = { ...copy[idx], attended };
      return copy;
    })();

    tx.set(eventRef, { attendees: nextAttendees }, { merge: true });
    tx.set(userRef, { eventHistory: nextHistory }, { merge: true });
  });
}
