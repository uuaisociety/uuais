import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  onSnapshot,
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
  increment,
  DocumentData,
  Timestamp,
  deleteDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase-client';
import { Event, EventRegistration } from '@/types';
// no shared utils required here for now
import { sendTemplatedEmail } from '@/lib/email';

export const getMyRegistrations = async (userId: string): Promise<EventRegistration[]> => {
  const regRef = collection(db, 'registrations');
  const qy = query(regRef, where('userId', '==', userId));
  const snapshot = await getDocs(qy);
  return snapshot.docs.map((d) => {
    const data: DocumentData | undefined = d.exists() ? d.data() : undefined;
    const ts = data?.registeredAt;
    const registeredAt = ts instanceof Timestamp ? ts.toDate().toISOString() : '';
    const registrationData = (data?.registrationData ?? {}) as EventRegistration['registrationData'];
    return {
      id: d.id,
      eventId: data?.eventId ?? '',
      userId: data?.userId ?? '',
      registrationData,
      registeredAt,
      status: (data?.status ?? 'registered') as EventRegistration['status'],
      userName: (data?.userName ?? null) as EventRegistration['userName'],
      userEmail: (data?.userEmail ?? null) as EventRegistration['userEmail'],
      selectedAt: (data?.selectedAt ?? null) as EventRegistration['selectedAt'],
      confirmedAt: (data?.confirmedAt ?? null) as EventRegistration['confirmedAt'],
      confirmationToken: (data?.confirmationToken ?? null) as EventRegistration['confirmationToken'],
    } as EventRegistration;
  });
};

export const getEventRegistrations = async (eventId: string): Promise<EventRegistration[]> => {
  const regRef = collection(db, 'registrations');
  const qy = query(regRef, where('eventId', '==', eventId));
  const snapshot = await getDocs(qy);
  return snapshot.docs.map((d) => {
    const data: DocumentData | undefined = d.exists() ? d.data() : undefined;
    const ts = data?.registeredAt;
    const registeredAt = ts instanceof Timestamp ? ts.toDate().toISOString() : '';
    const registrationData = (data?.registrationData ?? {}) as EventRegistration['registrationData'];
    return {
      id: d.id,
      eventId: data?.eventId ?? '',
      userId: data?.userId ?? '',
      registrationData,
      registeredAt,
      status: (data?.status ?? 'registered') as EventRegistration['status'],
      userName: (data?.userName ?? null) as EventRegistration['userName'],
      userEmail: (data?.userEmail ?? null) as EventRegistration['userEmail'],
      selectedAt: (data?.selectedAt ?? null) as EventRegistration['selectedAt'],
      confirmedAt: (data?.confirmedAt ?? null) as EventRegistration['confirmedAt'],
      confirmationToken: (data?.confirmationToken ?? null) as EventRegistration['confirmationToken'],
    } as EventRegistration;
  });
};

export const subscribeToEventRegistrations = (
  eventId: string,
  callback: (regs: EventRegistration[]) => void
) => {
  const regRef = collection(db, 'registrations');
  const qy = query(regRef, where('eventId', '==', eventId));
  return onSnapshot(qy, (snapshot) => {
    const regs: EventRegistration[] = snapshot.docs.map((d) => {
      const data: DocumentData | undefined = d.exists() ? d.data() : undefined;
      const ts = data?.registeredAt;
      const registeredAt = ts instanceof Timestamp ? ts.toDate().toISOString() : '';
      const registrationData = (data?.registrationData ?? {}) as EventRegistration['registrationData'];
      return {
        id: d.id,
        eventId: data?.eventId ?? '',
        userId: data?.userId ?? '',
        registrationData,
        registeredAt,
        status: (data?.status ?? 'registered') as EventRegistration['status'],
        userName: (data?.userName ?? null) as EventRegistration['userName'],
        userEmail: (data?.userEmail ?? null) as EventRegistration['userEmail'],
        selectedAt: (data?.selectedAt ?? null) as EventRegistration['selectedAt'],
        confirmedAt: (data?.confirmedAt ?? null) as EventRegistration['confirmedAt'],
        confirmationToken: (data?.confirmationToken ?? null) as EventRegistration['confirmationToken'],
      } as EventRegistration;
    });
    callback(regs);
  });
};

export const registerForEvent = async (
  eventId: string,
  payload: Omit<EventRegistration, 'id' | 'eventId' | 'registeredAt' | 'status' | 'userId'> & {
    registrationData: EventRegistration['registrationData'];
    userId: string;
    userEmail?: string;
    userName?: string;
  },
  options?: { waitlist?: boolean }
): Promise<string> => {
  const regRef = collection(db, 'registrations');

  {
    const qDup = query(regRef, where('eventId', '==', eventId), where('userId', '==', payload.userId));
    const sDup = await getDocs(qDup);
    let hasActive = false;
    for (const d of sDup.docs) {
      const data = d.data() as DocumentData;
      const status = String(data?.status || 'registered');
      if (status === 'cancelled') {
        try {
          await deleteDoc(doc(db, 'registrations', d.id));
        } catch (err) {
          // Silently ignore - cancelled registration deletion failure is non-critical
          console.warn('Failed to delete cancelled registration:', err);
        }
      } else {
        hasActive = true;
      }
    }
    if (hasActive) throw new Error('You have already registered for this event.');
  }

  const eventRef = doc(db, 'events', eventId);
  let eventData: Partial<Event> = {};
  try {
    const eventSnap = await getDoc(eventRef);
    eventData = eventSnap.exists() ? (eventSnap.data() as Partial<Event>) : {};
  } catch (err: unknown) {
    // Likely permission-denied (unpublished event). Surface a friendly error.
    if (err && typeof err === 'object' && 'code' in err && (err as { code?: string }).code === 'permission-denied') {
      throw new Error('You do not have permission to register for this event.');
    }
    throw err;
  }

  const maxCapacity = typeof eventData.maxCapacity === 'number' ? eventData.maxCapacity : undefined;
  const currentRegistrations = typeof eventData.currentRegistrations === 'number' ? eventData.currentRegistrations : 0;
  const isCapacityFull = typeof maxCapacity === 'number' ? currentRegistrations >= maxCapacity : false;

  const lastRegistrationAtIso = eventData.registrationClosesAt;
  const now = new Date();
  const isAfterLastRegistration = typeof lastRegistrationAtIso === 'string' && lastRegistrationAtIso
    ? now.getTime() > new Date(lastRegistrationAtIso).getTime()
    : false;

  const status: EventRegistration['status'] = (options?.waitlist || isCapacityFull || isAfterLastRegistration)
    ? 'waitlist'
    : 'registered';

  const regDoc: Record<string, unknown> = {
    eventId,
    registrationData: payload.registrationData,
    registeredAt: serverTimestamp(),
    status,
    userEmail: payload.userEmail || null,
    userName: payload.userName || null,
    userId: payload.userId,
  };

  // Create the registration document first. Then attempt to increment the
  // event's currentRegistrations as a best-effort operation. We avoid using
  // a transaction here because transaction commits were triggering
  // permission-denied in some client environments. If the increment fails
  // due to permissions, we still return the registration id — admins or a
  // server-side worker can reconcile counts later.
  const docRef = await addDoc(regRef, regDoc as DocumentData);
  const newRegId = docRef.id;

  if (status === 'registered') {
    try {
      await updateDoc(eventRef, { currentRegistrations: increment(1) });
    } catch (err: unknown) {
      // Do not block registration on event update failures. Surface a
      // warning for server-side monitoring; client callers get the
      // registration id and can be informed that counts may be stale.
      console.warn('Failed to increment event.currentRegistrations', err);
    }
  }

  return newRegId;
};

// ----------------------------
// Selection & Confirmation Workflow (admin-only operations)
// ----------------------------

function randomToken(length = 32): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let out = '';
  const array = new Uint32Array(length);
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(array);
    for (let i = 0; i < length; i++) out += alphabet[array[i] % alphabet.length];
  } else {
    for (let i = 0; i < length; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

export async function inviteRegistrant(
  regId: string,
  options?: { baseUrl?: string; expiresInDays?: number }
): Promise<void> {
  // admin-only client should call this
  const regRef = doc(db, 'registrations', regId);
  const regSnap = await getDoc(regRef);
  if (!regSnap.exists()) throw new Error('Registration not found');
  const reg = regSnap.data() as DocumentData;
  const token = randomToken(40);
  const selectedAtIso = new Date().toISOString();

  await updateDoc(regRef, {
    status: 'invited',
    selectedAt: selectedAtIso,
    confirmationToken: token,
  } as DocumentData);

  const to = (reg.userEmail as string | null) || null;
  const name = (reg.userName as string | null) || null;
  if (!to) return; // cannot email without address

  // Optional: Check unsubscribe flag on user profile
  let unsub = false;
  try {
    const userId = String(reg.userId || '');
    if (userId) {
      const userSnap = await getDoc(doc(db, 'users', userId));
      const u = userSnap.exists() ? (userSnap.data() as DocumentData) : undefined;
      unsub = !!u?.unsubscribedFromEmails;
    }
  } catch (err) {
    // Silently ignore - user profile fetch failure shouldn't block email sending
    console.warn('Failed to check unsubscribe status:', err);
  }
  if (unsub) return;

  const base = options?.baseUrl || (typeof window !== 'undefined' ? window.location.origin : '');
  const link = `${base}/confirm/${token}`;
  let subject = 'You are invited to confirm your spot';
  try {
    const eventId = String(reg.eventId || '');
    if (eventId) {
      const eSnap = await getDoc(doc(db, 'events', eventId));
      const e = eSnap.exists() ? (eSnap.data() as Partial<Event>) : undefined;
      if (e?.title) subject = `Invitation to ${e.title}`;
    }
  } catch (err) {
    // Silently ignore - event fetch failure shouldn't block email sending
    console.warn('Failed to fetch event title for email:', err);
  }
  await sendTemplatedEmail({
    to,
    subject,
    templatePath: '/email-templates/eventRegistration.html',
    variables: {
      name: name || '',
      confirm_link: link,
    },
  });
}

export async function confirmRegistrationByToken(token: string): Promise<{ ok: boolean; message: string }> {
  if (!token) return { ok: false, message: 'Invalid token' };
  const regRef = collection(db, 'registrations');
  const qy = query(regRef, where('confirmationToken', '==', token));
  const snap = await getDocs(qy);
  if (snap.empty) return { ok: false, message: 'Token not found or already used' };
  const d = snap.docs[0];
  const reg = d.data() as DocumentData;
  if (reg.status !== 'invited') return { ok: false, message: 'This invitation is no longer valid' };

  const eventId = String(reg.eventId || '');
  if (!eventId) return { ok: false, message: 'Event missing' };
  const eventRef = doc(db, 'events', eventId);
  const eventSnap = await getDoc(eventRef);
  const eventData = eventSnap.exists() ? (eventSnap.data() as Partial<Event>) : {};

  // Optionally enforce capacity here
  const maxCapacity = typeof eventData.maxCapacity === 'number' ? eventData.maxCapacity : undefined;
  const currentRegistrations = typeof eventData.currentRegistrations === 'number' ? eventData.currentRegistrations : 0;
  if (typeof maxCapacity === 'number' && currentRegistrations >= maxCapacity) {
    return { ok: false, message: 'Sorry, the event is full' };
  }

  await updateDoc(doc(db, 'registrations', d.id), {
    status: 'confirmed',
    confirmedAt: new Date().toISOString(),
    confirmationToken: null,
  } as DocumentData);

  // Increment event count
  await updateDoc(eventRef, { currentRegistrations: increment(1) });
  return { ok: true, message: 'Registration confirmed' };
}

export async function declineRegistration(regId: string): Promise<void> {
  await updateDoc(doc(db, 'registrations', regId), { status: 'declined' } as DocumentData);
}

export async function cancelRegistration(regId: string): Promise<void> {
  await updateDoc(doc(db, 'registrations', regId), { status: 'cancelled' } as DocumentData);
}

export async function getMyRegistrationForEvent(userId: string, eventId: string): Promise<EventRegistration | null> {
  const regRef = collection(db, 'registrations');
  const qy = query(regRef, where('userId', '==', userId), where('eventId', '==', eventId));
  const snap = await getDocs(qy);
  if (snap.empty) return null;
  const d = snap.docs[0];
  const data: DocumentData | undefined = d.exists() ? d.data() : undefined;
  const ts = data?.registeredAt;
  const registeredAt = ts instanceof Timestamp ? ts.toDate().toISOString() : '';
  const registrationData = (data?.registrationData ?? {}) as EventRegistration['registrationData'];
  return {
    id: d.id,
    eventId: data?.eventId ?? '',
    userId: data?.userId ?? '',
    registrationData,
    registeredAt,
    status: (data?.status ?? 'registered') as EventRegistration['status'],
    userName: (data?.userName ?? null) as EventRegistration['userName'],
    userEmail: (data?.userEmail ?? null) as EventRegistration['userEmail'],
    selectedAt: (data?.selectedAt ?? null) as EventRegistration['selectedAt'],
    confirmedAt: (data?.confirmedAt ?? null) as EventRegistration['confirmedAt'],
    confirmationToken: (data?.confirmationToken ?? null) as EventRegistration['confirmationToken'],
  } as EventRegistration;
}

export async function cancelMyRegistrationForEvent(userId: string, eventId: string): Promise<void> {
  const regRef = collection(db, 'registrations');
  const qy = query(regRef, where('userId', '==', userId), where('eventId', '==', eventId));
  const snap = await getDocs(qy);
  if (snap.empty) return;
  const d = snap.docs.find((x) => (x.data() as DocumentData)?.status !== 'cancelled') || snap.docs[0];
  await updateDoc(doc(db, 'registrations', d.id), { status: 'cancelled' } as DocumentData);
}

export async function confirmRegistration(regId: string, token: string): Promise<{ ok: boolean; message: string }> {
  const ref = doc(db, 'registrations', regId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return { ok: false, message: 'Registration not found' };
  const data = snap.data() as DocumentData;
  if (data.status !== 'invited') return { ok: false, message: 'Not invited' };
  if (!data.confirmationToken || data.confirmationToken !== token) return { ok: false, message: 'Invalid token' };

  const eventId = String(data.eventId || '');
  if (!eventId) return { ok: false, message: 'Event missing' };
  const eventRef = doc(db, 'events', eventId);
  const eventSnap = await getDoc(eventRef);
  const eventData = eventSnap.exists() ? (eventSnap.data() as Partial<Event>) : {};
  const maxCapacity = typeof eventData.maxCapacity === 'number' ? eventData.maxCapacity : undefined;
  const currentRegistrations = typeof eventData.currentRegistrations === 'number' ? eventData.currentRegistrations : 0;
  if (typeof maxCapacity === 'number' && currentRegistrations >= maxCapacity) {
    return { ok: false, message: 'Event full' };
  }

  await updateDoc(ref, { status: 'confirmed', confirmedAt: new Date().toISOString(), confirmationToken: null } as DocumentData);
  await updateDoc(eventRef, { currentRegistrations: increment(1) });
  return { ok: true, message: 'Confirmed' };
}
