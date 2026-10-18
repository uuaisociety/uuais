import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import '@/lib/firebase-admin';
import { FieldValue, type DocumentReference } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase-admin';
import { checkWindow } from '@/lib/rate-limit-in-memory';
import { readBoundedRequest } from '@/lib/bounded-request-body';
import { isIP } from 'node:net';

const MAX_CONFIRM_BODY_BYTES = 4 * 1024;

export async function POST(req: NextRequest) {
  const forwardedIp =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '';
  const ip = isIP(forwardedIp) ? forwardedIp : 'unknown';
  const rate = checkWindow(`registration-confirm:${ip}`, 10, 60 * 60 * 1000);
  if (!rate.allowed)
    return NextResponse.json(
      { ok: false, message: 'Too many attempts. Please try again later.' },
      { status: 429 },
    );
  let body: unknown;
  try {
    const boundedRequest = await readBoundedRequest(
      req,
      MAX_CONFIRM_BODY_BYTES,
    );
    if (!boundedRequest)
      return NextResponse.json(
        { ok: false, message: 'Invalid token' },
        { status: 413 },
      );
    body = await boundedRequest.json();
  } catch {
    return NextResponse.json(
      { ok: false, message: 'Invalid token' },
      { status: 400 },
    );
  }
  const { token, regId } = (body && typeof body === 'object' ? body : {}) as {
    token?: unknown;
    regId?: unknown;
  };
  if (
    typeof token !== 'string' ||
    !/^[A-Za-z0-9]{40}$/.test(token) ||
    (regId !== undefined &&
      (typeof regId !== 'string' || !/^[^/]{1,150}$/.test(regId)))
  ) {
    return NextResponse.json(
      { ok: false, message: 'Invalid token' },
      { status: 400 },
    );
  }
  try {
    const registrations = adminDb.collection('registrations');
    let registrationRef: DocumentReference;
    if (regId) {
      registrationRef = registrations.doc(regId);
      const existing = await registrationRef.get();
      if (!existing.exists)
        return NextResponse.json({
          ok: false,
          message: 'Registration not found',
        });
      if (existing.get('status') !== 'invited')
        return NextResponse.json({ ok: false, message: 'Not invited' });
      if (existing.get('confirmationToken') !== token)
        return NextResponse.json({ ok: false, message: 'Invalid token' });
    } else {
      const match = await registrations
        .where('confirmationToken', '==', token)
        .limit(1)
        .get();
      if (match.empty)
        return NextResponse.json({
          ok: false,
          message: 'Token not found or already used',
        });
      registrationRef = match.docs[0].ref;
    }
    const result = await adminDb.runTransaction(async (transaction) => {
      const registration = await transaction.get(registrationRef);
      if (
        !registration.exists ||
        registration.get('status') !== 'invited' ||
        registration.get('confirmationToken') !== token
      )
        return {
          ok: false,
          message: regId ? 'Not invited' : 'This invitation is no longer valid',
        };
      const eventId = registration.get('eventId');
      if (typeof eventId !== 'string' || !eventId || eventId.includes('/'))
        return { ok: false, message: 'Event missing' };
      const eventRef = adminDb.collection('events').doc(eventId);
      const event = await transaction.get(eventRef);
      if (!event.exists) return { ok: false, message: 'Event missing' };
      const max = event.get('maxCapacity');
      const current = event.get('currentRegistrations');
      if (
        typeof max === 'number' &&
        (typeof current === 'number' ? current : 0) >= max
      )
        return {
          ok: false,
          message: regId ? 'Event full' : 'Sorry, the event is full',
        };
      transaction.update(registrationRef, {
        status: 'confirmed',
        confirmedAt: new Date().toISOString(),
        confirmationToken: null,
      });
      transaction.update(eventRef, {
        currentRegistrations: FieldValue.increment(1),
      });
      return {
        ok: true,
        message: regId ? 'Confirmed' : 'Registration confirmed',
      };
    });
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { ok: false, message: 'Unable to confirm registration' },
      { status: 500 },
    );
  }
}
