import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/server-auth';
import { adminDb } from '@/lib/firebase-admin';
import { checkWindow } from '@/lib/rate-limit-in-memory';
import {
  collectRegistrationFilePaths,
  deleteStorageFiles,
} from '@/lib/server-registration-files';
import { isSafeStoragePath } from '@/lib/admin-file-download';

const DELETE_LIMIT = 20;
const DELETE_WINDOW_MS = 10 * 60 * 1000;
const REG_ID_RE = /^[A-Za-z0-9_-]{1,128}$/;
const OWN_UPLOAD_RE = /^registrations\/[A-Za-z0-9_-]{1,128}\/([^/]+)\//;

/**
 * DELETE /api/registrations/file?regId=...
 * DELETE /api/registrations/file?path=...
 *
 * Deletes the Storage attachments referenced by a registration. Owners may
 * delete their own; admins may delete any. File paths are derived from the
 * stored document and must live under registrations/{eventId}/{ownerUid}/ —
 * callers cannot name arbitrary files.
 *
 * The path form rolls back an upload whose registration failed; it only
 * accepts files under the caller's own registrations/{eventId}/{uid}/ prefix.
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

    const params = new URL(req.url).searchParams;
    const path = params.get('path');
    if (path !== null) {
      const match = OWN_UPLOAD_RE.exec(path);
      if (!match || match[1] !== uid || !isSafeStoragePath(path, match[0])) {
        return NextResponse.json(
          { error: 'Invalid file path' },
          { status: 400 },
        );
      }
      const deleted = await deleteStorageFiles([path]);
      return NextResponse.json({ success: true, deleted });
    }

    const regId = params.get('regId') || '';
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
