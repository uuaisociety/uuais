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

type AttendanceDoc = { entries: EventAttendanceEntry[] };

function attendanceRef(eventId: string) {
  return doc(db, 'eventAttendance', eventId);
}

function entriesFrom(data: DocumentData | undefined): EventAttendanceEntry[] {
  return Array.isArray(data?.entries)
    ? (data.entries as EventAttendanceEntry[])
    : [];
}

/** Admin-only: attendance lives in a restricted collection so public event reads never expose attendee IDs. */
export async function getEventAttendance(
  eventId: string,
): Promise<EventAttendanceEntry[]> {
  if (!eventId) return [];
  const snap = await getDoc(attendanceRef(eventId));
  if (!snap.exists()) return [];
  return entriesFrom(snap.data());
}

export const subscribeToEventAttendance = (
  eventId: string,
  callback: (entries: EventAttendanceEntry[]) => void,
) => {
  if (!eventId) return () => {};
  return onSnapshot(
    attendanceRef(eventId),
    (snap) => {
      callback(snap.exists() ? entriesFrom(snap.data()) : []);
    },
    (error) => {
      console.error('Firestore subscription failed:', error);
      callback([]);
    },
  );
};

export async function setAttendanceForUser(
  eventId: string,
  userId: string,
  attended: boolean | null,
): Promise<void> {
  if (!eventId || !userId) return;

  await runTransaction(db, async (tx) => {
    const attRef = attendanceRef(eventId);
    const userRef = doc(db, 'users', userId);

    const [attSnap, userSnap] = await Promise.all([
      tx.get(attRef),
      tx.get(userRef),
    ]);

    const entries = entriesFrom(
      attSnap.exists() ? (attSnap.data() as DocumentData) : undefined,
    );
    const userData = (
      userSnap.exists() ? (userSnap.data() as DocumentData) : {}
    ) as DocumentData;

    const eventHistory: UserEventHistoryEntry[] = Array.isArray(
      userData.eventHistory,
    )
      ? (userData.eventHistory as UserEventHistoryEntry[])
      : [];

    const nowTs = attended ? Date.now() : null;

    const nextEntries = (() => {
      const idx = entries.findIndex((a) => a.userId === userId);
      if (idx === -1)
        return entries.concat({ userId, attended, timestamp: nowTs });
      const copy = entries.slice();
      copy[idx] = { ...copy[idx], attended, timestamp: nowTs };
      return copy;
    })();

    const nextHistory = (() => {
      const idx = eventHistory.findIndex((h) => h.eventId === eventId);
      if (idx === -1) return eventHistory.concat({ eventId, attended });
      const copy = eventHistory.slice();
      copy[idx] = { ...copy[idx], attended };
      return copy;
    })();

    tx.set(attRef, { entries: nextEntries } satisfies AttendanceDoc, {
      merge: true,
    });
    tx.set(userRef, { eventHistory: nextHistory }, { merge: true });
  });
}
