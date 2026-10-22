import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requireAdmin, authFailureResponse } from '@/lib/server-auth';
import { adminDb } from '@/lib/firebase-admin';
import { checkWindow } from '@/lib/rate-limit-in-memory';
import { deleteRegistrationFilePaths } from '@/lib/server-registration-files';
import { logAdminAction } from '@/lib/server-audit-log';

const REMOVE_LIMIT = 60;
const REMOVE_WINDOW_MS = 10 * 60 * 1000;
const REG_ID_RE = /^[A-Za-z0-9_-]{1,128}$/;

/**
 * DELETE /api/admin/registrations?regId=...
 *
 * Admin-only removal. Deletes the registration document first, then its
 * uploaded files, and keeps the event counter consistent. Every removal is
 * recorded in adminAuditLogs.
 */
export async function DELETE(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.ok) return authFailureResponse(auth.reason);
    const adminUid = auth.session.uid;

    const rate = checkWindow(
      `admin-registration-remove:${adminUid}`,
      REMOVE_LIMIT,
      REMOVE_WINDOW_MS,
    );
    if (!rate.allowed)
      return NextResponse.json(
        { error: 'Too many removals. Please try again later.' },
        { status: 429 },
      );

    const regId = new URL(req.url).searchParams.get('regId') || '';
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
      eventId?: unknown;
      userId?: unknown;
      status?: unknown;
      counted?: unknown;
      registrationData?: Record<string, unknown>;
    };

    const eventId = typeof data.eventId === 'string' ? data.eventId : '';

    await adminDb.runTransaction(async (transaction) => {
      const current = await transaction.get(regRef);
      if (!current.exists) return;
      const status = String(current.get('status') || 'registered');
      const counted =
        current.get('counted') === true ||
        (current.get('counted') === undefined &&
          (status === 'registered' || status === 'confirmed'));

      // Firestore transactions require every read before any write.
      const eventRef =
        counted && eventId ? adminDb.collection('events').doc(eventId) : null;
      const event = eventRef ? await transaction.get(eventRef) : null;

      transaction.delete(regRef);

      if (eventRef && event?.exists) {
        const total = event.get('currentRegistrations');
        const next = Math.max(0, (typeof total === 'number' ? total : 0) - 1);
        transaction.update(eventRef, { currentRegistrations: next });
      }
    });

    // Doc is gone first, so a file failure can never leave dead links behind.
    const deleted = await deleteRegistrationFilePaths(data);

    const forwarded = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
    await logAdminAction({
      action: 'remove',
      adminUid,
      eventId: eventId || undefined,
      regId,
      count: deleted,
      ip: forwarded || undefined,
    });

    return NextResponse.json({ success: true, deleted });
  } catch (err) {
    console.error('admin registration remove error', err);
    return NextResponse.json(
      { error: 'Failed to remove registration' },
      { status: 500 },
    );
  }
}
