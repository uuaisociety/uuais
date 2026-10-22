import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/server-auth';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { checkWindow } from '@/lib/rate-limit-in-memory';
import { readBoundedRequest } from '@/lib/bounded-request-body';
import { isSafeStoragePath } from '@/lib/admin-file-download';
import { deleteRegistrationFilePaths } from '@/lib/server-registration-files';
import type { UploadedFileRef } from '@/types';

const CREATE_LIMIT = 10;
const CREATE_WINDOW_MS = 10 * 60 * 1000;
const DELETE_LIMIT = 20;
const DELETE_WINDOW_MS = 10 * 60 * 1000;
const MAX_BODY_BYTES = 64 * 1024;
const EVENT_ID_RE = /^[A-Za-z0-9_-]{1,128}$/;
const REG_ID_RE = /^[A-Za-z0-9_-]{1,128}$/;

const ACTIVE_BLOCKING_STATUSES = new Set([
  'registered',
  'waitlist',
  'invited',
  'confirmed',
]);

class RegistrationError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

interface RegistrationBody {
  eventId: string;
  registrationData: Record<string, unknown>;
  userEmail?: string;
  userName?: string;
  waitlist?: boolean;
}

function isUploadedFileRefFor(
  value: unknown,
  eventId: string,
  uid: string,
): value is UploadedFileRef {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const ref = value as Partial<UploadedFileRef>;
  if (
    typeof ref.path !== 'string' ||
    typeof ref.name !== 'string' ||
    typeof ref.size !== 'number'
  )
    return false;
  return isSafeStoragePath(ref.path, `registrations/${eventId}/${uid}/`);
}

function isAnswerValue(value: unknown, eventId: string, uid: string): boolean {
  if (typeof value === 'string') return value.length <= 10_000;
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value === 'boolean') return true;
  if (Array.isArray(value))
    return (
      value.length <= 100 &&
      value.every((item) => typeof item === 'string' && item.length <= 1_000)
    );
  return isUploadedFileRefFor(value, eventId, uid);
}

function parseBody(raw: unknown, uid: string): RegistrationBody {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    throw new RegistrationError('Invalid request body');
  const body = raw as Record<string, unknown>;
  const eventId = typeof body.eventId === 'string' ? body.eventId : '';
  if (!EVENT_ID_RE.test(eventId))
    throw new RegistrationError('Invalid event id');

  const data = body.registrationData;
  if (!data || typeof data !== 'object' || Array.isArray(data))
    throw new RegistrationError('Invalid registration data');
  const registrationData = data as Record<string, unknown>;
  if (Object.keys(registrationData).length > 100)
    throw new RegistrationError('Too many answers');
  for (const [key, value] of Object.entries(registrationData)) {
    if (!key || key.length > 300)
      throw new RegistrationError('Invalid question key');
    if (!isAnswerValue(value, eventId, uid))
      throw new RegistrationError('Invalid answer');
  }

  const userEmail =
    typeof body.userEmail === 'string' ? body.userEmail.trim() : undefined;
  if (userEmail && userEmail.length > 320)
    throw new RegistrationError('Invalid email');
  const userName =
    typeof body.userName === 'string' ? body.userName.trim() : undefined;
  if (userName && userName.length > 200)
    throw new RegistrationError('Invalid name');

  return {
    eventId,
    registrationData,
    userEmail,
    userName,
    waitlist: body.waitlist === true,
  };
}

/**
 * POST /api/registrations
 *
 * Creates a registration server-side so capacity, duplicate, deadline, and
 * counter updates cannot be bypassed with direct client SDK writes.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth.ok)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const uid = auth.session.uid;

    const rate = checkWindow(
      `registration-create:${uid}`,
      CREATE_LIMIT,
      CREATE_WINDOW_MS,
    );
    if (!rate.allowed)
      return NextResponse.json(
        { error: 'Too many registration attempts. Please try again later.' },
        { status: 429 },
      );

    const bounded = await readBoundedRequest(req, MAX_BODY_BYTES);
    if (!bounded)
      return NextResponse.json({ error: 'Request too large' }, { status: 413 });
    let raw: unknown;
    try {
      raw = await bounded.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    const body = parseBody(raw, uid);

    const profile = await adminDb.collection('users').doc(uid).get();
    if (
      !profile.exists ||
      (profile.data() as { isMember?: unknown } | undefined)?.isMember !== true
    ) {
      return NextResponse.json(
        { error: 'Membership required' },
        { status: 403 },
      );
    }

    const staleDocs: {
      eventId?: unknown;
      userId?: unknown;
      registrationData?: Record<string, unknown>;
    }[] = [];

    const result = await adminDb.runTransaction(async (transaction) => {
      const eventRef = adminDb.collection('events').doc(body.eventId);
      const eventSnap = await transaction.get(eventRef);
      if (!eventSnap.exists)
        throw new RegistrationError('Event not found', 404);
      if (eventSnap.get('published') !== true)
        throw new RegistrationError('Event is not open for registration', 403);

      const registrations = adminDb.collection('registrations');
      const existingQuery = registrations
        .where('eventId', '==', body.eventId)
        .where('userId', '==', uid);
      const existing = await transaction.get(existingQuery);

      for (const docSnap of existing.docs) {
        const status = String(docSnap.get('status') || 'registered');
        if (ACTIVE_BLOCKING_STATUSES.has(status))
          throw new RegistrationError(
            'You have already registered for this event.',
            409,
          );
        staleDocs.push(
          docSnap.data() as {
            eventId?: unknown;
            userId?: unknown;
            registrationData?: Record<string, unknown>;
          },
        );
        transaction.delete(docSnap.ref);
      }

      const maxCapacity = eventSnap.get('maxCapacity');
      const currentRegistrations = eventSnap.get('currentRegistrations');
      const current =
        typeof currentRegistrations === 'number' ? currentRegistrations : 0;
      const isFull = typeof maxCapacity === 'number' && current >= maxCapacity;

      const closesAt = eventSnap.get('registrationClosesAt');
      const isClosed =
        typeof closesAt === 'string' &&
        closesAt.length > 0 &&
        Date.now() > new Date(closesAt).getTime();

      const status =
        body.waitlist || isFull || isClosed ? 'waitlist' : 'registered';
      const counted = status === 'registered';

      const regRef = registrations.doc(`${body.eventId}_${uid}`);
      transaction.set(regRef, {
        eventId: body.eventId,
        registrationData: body.registrationData,
        registeredAt: FieldValue.serverTimestamp(),
        status,
        counted,
        userEmail: body.userEmail || null,
        userName: body.userName || null,
        userId: uid,
      });

      if (counted) {
        transaction.update(eventRef, {
          currentRegistrations: FieldValue.increment(1),
        });
      }

      return { regId: regRef.id, status };
    });

    await Promise.all(staleDocs.map((doc) => deleteRegistrationFilePaths(doc)));

    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof RegistrationError)
      return NextResponse.json({ error: err.message }, { status: err.status });
    console.error('registration create error', err);
    return NextResponse.json(
      { error: 'Unable to register for this event' },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/registrations?regId=...&mode=cancel|decline
 *
 * Owner-only status change. Keeps the event counter consistent and deletes the
 * registration's uploaded files.
 */
export async function DELETE(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth.ok)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const uid = auth.session.uid;

    const rate = checkWindow(
      `registration-mutate:${uid}`,
      DELETE_LIMIT,
      DELETE_WINDOW_MS,
    );
    if (!rate.allowed)
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 },
      );

    const params = new URL(req.url).searchParams;
    const regId = params.get('regId') || '';
    const mode = params.get('mode') === 'decline' ? 'decline' : 'cancel';
    if (!REG_ID_RE.test(regId))
      return NextResponse.json(
        { error: 'Invalid registration id' },
        { status: 400 },
      );

    const regRef = adminDb.collection('registrations').doc(regId);
    const snap = await regRef.get();
    if (!snap.exists)
      return NextResponse.json(
        { error: 'Registration not found' },
        { status: 404 },
      );
    const data = snap.data() as {
      userId?: unknown;
      eventId?: unknown;
      status?: unknown;
      counted?: unknown;
      registrationData?: Record<string, unknown>;
    };
    if (data.userId !== uid)
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    await adminDb.runTransaction(async (transaction) => {
      const current = await transaction.get(regRef);
      if (!current.exists) return;
      const currentStatus = String(current.get('status') || 'registered');
      if (currentStatus === 'cancelled' || currentStatus === 'declined') return;
      const counted =
        current.get('counted') === true ||
        (current.get('counted') === undefined &&
          (currentStatus === 'registered' || currentStatus === 'confirmed'));

      // Firestore transactions require every read before any write.
      const eventId = current.get('eventId');
      const eventRef =
        counted && typeof eventId === 'string' && eventId
          ? adminDb.collection('events').doc(eventId)
          : null;
      const event = eventRef ? await transaction.get(eventRef) : null;

      transaction.update(regRef, {
        status: mode === 'decline' ? 'declined' : 'cancelled',
        counted: false,
      });

      if (eventRef && event?.exists) {
        const total = event.get('currentRegistrations');
        const next = Math.max(0, (typeof total === 'number' ? total : 0) - 1);
        transaction.update(eventRef, { currentRegistrations: next });
      }
    });

    const deleted = await deleteRegistrationFilePaths(data);

    return NextResponse.json({ success: true, deleted });
  } catch (err) {
    console.error('registration delete error', err);
    return NextResponse.json(
      { error: 'Unable to update registration' },
      { status: 500 },
    );
  }
}
