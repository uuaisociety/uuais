import {
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
  doc,
  getDoc,
  updateDoc,
  DocumentData,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase-client';
import { EventRegistration } from '@/types';
import { requestAdminEmail } from '@/lib/email';

// ---------------------------------------------------------------------------
// Batch helper for analytics (avoids N+1 queries over event IDs)
// ---------------------------------------------------------------------------

const BATCH_SIZE = 30;

export interface RegistrationDoc {
  id: string;
  eventId: string;
  status: string;
  registeredAt: unknown;
  userId?: string;
  registrationData?: Record<string, unknown>;
}

function parseRegDoc(d: { id: string; data(): DocumentData }): RegistrationDoc {
  const data = d.data();
  return {
    id: d.id,
    eventId: data.eventId || '',
    status: data.status || 'registered',
    registeredAt: data.registeredAt,
    userId: data.userId,
    registrationData: data.registrationData as
      Record<string, unknown> | undefined,
  };
}

function mapEventRegistration(d: {
  id: string;
  exists(): boolean;
  data(): DocumentData;
}): EventRegistration {
  const data = d.exists() ? d.data() : undefined;
  const registeredAt =
    data?.registeredAt instanceof Timestamp
      ? data.registeredAt.toDate().toISOString()
      : '';
  return {
    id: d.id,
    eventId: data?.eventId ?? '',
    userId: data?.userId ?? '',
    registrationData: (data?.registrationData ??
      {}) as EventRegistration['registrationData'],
    registeredAt,
    status: (data?.status ?? 'registered') as EventRegistration['status'],
    userName: (data?.userName ?? null) as EventRegistration['userName'],
    userEmail: (data?.userEmail ?? null) as EventRegistration['userEmail'],
    selectedAt: (data?.selectedAt ?? null) as EventRegistration['selectedAt'],
    confirmedAt: (data?.confirmedAt ??
      null) as EventRegistration['confirmedAt'],
    confirmationToken: (data?.confirmationToken ??
      null) as EventRegistration['confirmationToken'],
  } as EventRegistration;
}

export async function fetchRegistrationsByEventIds(
  eventIds: string[],
): Promise<Map<string, RegistrationDoc[]>> {
  const grouped = new Map<string, RegistrationDoc[]>();
  if (!eventIds.length) return grouped;

  for (let i = 0; i < eventIds.length; i += BATCH_SIZE) {
    const batch = eventIds.slice(i, i + BATCH_SIZE);
    const snap = await getDocs(
      query(collection(db, 'registrations'), where('eventId', 'in', batch)),
    );
    snap.docs.forEach((d) => {
      const r = parseRegDoc(d);
      const list = grouped.get(r.eventId);
      if (list) list.push(r);
      else grouped.set(r.eventId, [r]);
    });
  }

  return grouped;
}

// ---------------------------------------------------------------------------
// CRUD operations
// ---------------------------------------------------------------------------

export const getMyRegistrations = async (
  userId: string,
): Promise<EventRegistration[]> => {
  const regRef = collection(db, 'registrations');
  const qy = query(regRef, where('userId', '==', userId));
  const snapshot = await getDocs(qy);
  return snapshot.docs.map(mapEventRegistration);
};

export const getEventRegistrations = async (
  eventId: string,
): Promise<EventRegistration[]> => {
  const regRef = collection(db, 'registrations');
  const qy = query(regRef, where('eventId', '==', eventId));
  const snapshot = await getDocs(qy);
  return snapshot.docs.map(mapEventRegistration);
};

export const subscribeToEventRegistrations = (
  eventId: string,
  callback: (regs: EventRegistration[]) => void,
) => {
  const regRef = collection(db, 'registrations');
  const qy = query(regRef, where('eventId', '==', eventId));
  return onSnapshot(
    qy,
    (snapshot) => {
      const regs = snapshot.docs.map(mapEventRegistration);
      callback(regs);
    },
    (error) => {
      console.error('Firestore subscription failed:', error);
      callback([]);
    },
  );
};

/**
 * Registers via the server route so capacity, duplicates, deadlines, and the
 * event counter are enforced authoritatively.
 */
export const registerForEvent = async (
  eventId: string,
  payload: Omit<
    EventRegistration,
    'id' | 'eventId' | 'registeredAt' | 'status' | 'userId'
  > & {
    registrationData: EventRegistration['registrationData'];
    userId: string;
    userEmail?: string;
    userName?: string;
  },
  options?: { waitlist?: boolean },
): Promise<string> => {
  const res = await fetch('/api/registrations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      eventId,
      registrationData: payload.registrationData,
      userEmail: payload.userEmail,
      userName: payload.userName,
      waitlist: options?.waitlist === true,
    }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error || `Registration failed (${res.status})`);
  }
  const body = (await res.json()) as { regId?: string };
  if (!body.regId) throw new Error('Registration failed');
  return body.regId;
};

// ----------------------------
// Selection & Confirmation Workflow
// ----------------------------

function randomToken(length = 32): string {
  const alphabet =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let out = '';
  const array = new Uint32Array(length);
  if (
    typeof crypto === 'undefined' ||
    typeof crypto.getRandomValues !== 'function'
  )
    throw new Error('Secure random generator unavailable');
  crypto.getRandomValues(array);
  for (let i = 0; i < length; i++) out += alphabet[array[i] % alphabet.length];
  return out;
}

export async function inviteRegistrant(regId: string): Promise<void> {
  const regRef = doc(db, 'registrations', regId);
  const regSnap = await getDoc(regRef);
  if (!regSnap.exists()) throw new Error('Registration not found');
  const reg = regSnap.data() as DocumentData;
  const token = randomToken(40);
  const selectedAtIso = new Date().toISOString();
  const counted =
    typeof reg.counted === 'boolean'
      ? reg.counted
      : reg.status === 'registered' || reg.status === 'confirmed';

  await updateDoc(regRef, {
    status: 'invited',
    selectedAt: selectedAtIso,
    confirmationToken: token,
    counted,
  } as DocumentData);

  // The server sends the invitation from the stored registration (address,
  // token, unsubscribe check), and logs it.
  await requestAdminEmail('event-invite', regId);
}

export async function confirmRegistrationByToken(
  token: string,
): Promise<{ ok: boolean; message: string }> {
  return confirmViaApi({ token });
}

async function mutateRegistration(
  regId: string,
  mode: 'cancel' | 'decline',
): Promise<void> {
  const res = await fetch(
    `/api/registrations?regId=${encodeURIComponent(regId)}&mode=${mode}`,
    { method: 'DELETE' },
  );
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error || `Request failed (${res.status})`);
  }
}

export async function cancelRegistration(regId: string): Promise<void> {
  await mutateRegistration(regId, 'cancel');
}

export async function declineRegistration(regId: string): Promise<void> {
  await mutateRegistration(regId, 'decline');
}

/** Admin-only (server-enforced): deletes a registration and its files. */
export async function removeRegistration(regId: string): Promise<void> {
  const res = await fetch(
    `/api/admin/registrations?regId=${encodeURIComponent(regId)}`,
    { method: 'DELETE' },
  );
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error || `Remove failed (${res.status})`);
  }
}

export async function getMyRegistrationForEvent(
  userId: string,
  eventId: string,
): Promise<EventRegistration | null> {
  const regRef = collection(db, 'registrations');
  const qy = query(
    regRef,
    where('userId', '==', userId),
    where('eventId', '==', eventId),
  );
  const snap = await getDocs(qy);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return mapEventRegistration(d);
}

export async function cancelMyRegistrationForEvent(
  userId: string,
  eventId: string,
): Promise<void> {
  const regRef = collection(db, 'registrations');
  const qy = query(
    regRef,
    where('userId', '==', userId),
    where('eventId', '==', eventId),
  );
  const snap = await getDocs(qy);
  if (snap.empty) return;
  const d =
    snap.docs.find((x) => (x.data() as DocumentData)?.status !== 'cancelled') ||
    snap.docs[0];
  await cancelRegistration(d.id);
}

export async function confirmRegistration(
  regId: string,
  token: string,
): Promise<{ ok: boolean; message: string }> {
  return confirmViaApi({ regId, token });
}

async function confirmViaApi(payload: {
  regId?: string;
  token: string;
}): Promise<{ ok: boolean; message: string }> {
  const response = await fetch('/api/registrations/confirm', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return response.json();
}
