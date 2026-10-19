import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/server-auth';
import { adminDb } from '@/lib/firebase-admin';
import { checkWindow } from '@/lib/rate-limit-in-memory';
import { isUploadedFileRef } from '@/lib/registration-files';
import { getStorageBucketName } from '@/lib/image-upload';
import { isSafeStoragePath } from '@/lib/admin-file-download';
import '@/lib/firebase-admin';
import admin from 'firebase-admin';

const DELETE_LIMIT = 20;
const DELETE_WINDOW_MS = 10 * 60 * 1000;
const REG_ID_RE = /^[A-Za-z0-9_-]{1,128}$/;

/**
 * DELETE /api/registrations/file?regId=...
 *
 * Deletes the Storage attachments referenced by one of the caller's own
 * registrations (used when a registration is cancelled or declined). File
 * paths are derived from the stored document and must live under
 * registrations/{eventId}/{uid}/ — clients cannot name arbitrary files.
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
    if (data?.userId !== uid) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const eventId = typeof data.eventId === 'string' ? data.eventId : '';
    const prefix = `registrations/${eventId}/${uid}/`;
    const paths = Object.values(data.registrationData || {})
      .filter(isUploadedFileRef)
      .map((ref) => ref.path)
      .filter((path) => isSafeStoragePath(path, prefix));

    if (paths.length === 0)
      return NextResponse.json({ success: true, deleted: 0 });

    const appOptions = admin.app().options as
      { storageBucket?: string } | undefined;
    const bucketName = getStorageBucketName(appOptions);
    const bucket = bucketName
      ? admin.storage().bucket(bucketName)
      : admin.storage().bucket();

    let deleted = 0;
    for (const path of paths) {
      try {
        await bucket.file(path).delete();
        deleted++;
      } catch (err) {
        console.warn('Failed to delete registration file', path, err);
      }
    }

    return NextResponse.json({ success: true, deleted });
  } catch (err) {
    console.error('registration file delete error', err);
    return NextResponse.json(
      { error: 'Failed to delete files' },
      { status: 500 },
    );
  }
}
