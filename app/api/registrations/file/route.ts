import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/server-auth';
import { adminDb } from '@/lib/firebase-admin';
import { checkWindow } from '@/lib/rate-limit-in-memory';
import {
  collectRegistrationFilePaths,
  deleteStorageFiles,
} from '@/lib/server-registration-files';

const DELETE_LIMIT = 20;
const DELETE_WINDOW_MS = 10 * 60 * 1000;
const REG_ID_RE = /^[A-Za-z0-9_-]{1,128}$/;

/**
 * DELETE /api/registrations/file?regId=...
 *
 * Deletes the Storage attachments referenced by a registration. Owners may
 * delete their own; admins may delete any. File paths are derived from the
 * stored document and must live under registrations/{eventId}/{ownerUid}/ —
 * callers cannot name arbitrary files.
 */
export async function DELETE(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth.ok)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const uid = auth.session.uid;

    const rate = checkWindow(
      `registration-file-delete:${uid}`,
      DELETE_LIMIT,
      DELETE_WINDOW_MS,
    );
    if (!rate.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 },
      );
    }

    const regId = new URL(req.url).searchParams.get('regId') || '';
    if (!REG_ID_RE.test(regId)) {
      return NextResponse.json(
        { error: 'Invalid registration id' },
        { status: 400 },
      );
    }

    const snap = await adminDb.collection('registrations').doc(regId).get();
    if (!snap.exists)
      return NextResponse.json(
        { error: 'Registration not found' },
        { status: 404 },
      );

    const data = snap.data() as
      | {
          userId?: unknown;
          eventId?: unknown;
          registrationData?: Record<string, unknown>;
        }
      | undefined;
    const ownerUid = typeof data?.userId === 'string' ? data.userId : '';
    const isOwner = ownerUid !== '' && ownerUid === uid;
    if (!isOwner && !auth.session.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const deleted = await deleteStorageFiles(
      collectRegistrationFilePaths(data),
    );
    return NextResponse.json({ success: true, deleted });
  } catch (err) {
    console.error('registration file delete error', err);
    return NextResponse.json(
      { error: 'Failed to delete files' },
      { status: 500 },
    );
  }
}
