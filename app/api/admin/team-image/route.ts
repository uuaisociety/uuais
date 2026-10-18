import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/server-auth';
import '@/lib/firebase-admin';
import admin from 'firebase-admin';
import { checkWindow } from '@/lib/rate-limit-in-memory';
import {
  getFormFile,
  MULTIPART_OVERHEAD_BYTES,
  readBoundedFormData,
} from '@/lib/bounded-request-body';
import {
  getImageStorageUrls,
  getStorageBucketName,
  sanitizeUploadFilename,
} from '@/lib/image-upload';

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const MAX_MULTIPART_BYTES = MAX_UPLOAD_BYTES + MULTIPART_OVERHEAD_BYTES;

// Only allow paths in the team and event image folders.
function isSafeImagePath(path: string): boolean {
  return (
    (path.startsWith('team-images/') || path.startsWith('event-images/')) &&
    !path.includes('..') &&
    !path.includes('\\')
  );
}

function isLikelyImage(buf: Buffer) {
  if (!buf || buf.length < 4) return false;
  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return true;
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47)
    return true;
  // GIF: 47 49 46 38
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38)
    return true;
  // WebP: 'RIFF' .... 'WEBP'
  if (
    buf[0] === 0x52 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x46
  ) {
    // check for WEBP in bytes 8-11
    if (
      buf.length > 12 &&
      buf[8] === 0x57 &&
      buf[9] === 0x45 &&
      buf[10] === 0x42 &&
      buf[11] === 0x50
    )
      return true;
  }
  return false;
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.ok)
      return NextResponse.json(
        { error: 'unauthorized', reason: auth.reason },
        { status: 401 },
      );

    const rate = checkWindow(
      `team-image-upload:${auth.session.uid}`,
      20,
      60 * 60 * 1000,
    );
    if (!rate.allowed)
      return NextResponse.json({ error: 'rate-limit' }, { status: 429 });
    const form = await readBoundedFormData(req, MAX_MULTIPART_BYTES);
    if (!form)
      return NextResponse.json({ error: 'file-too-large' }, { status: 413 });
    const file = getFormFile(form, 'file');
    const previous = form.get('previousPath')?.toString();
    const folder = form.get('folder')?.toString() || 'uploads';

    if (!file)
      return NextResponse.json({ error: 'missing file' }, { status: 400 });
    if (file.size > MAX_UPLOAD_BYTES)
      return NextResponse.json({ error: 'file-too-large' }, { status: 400 });

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const contentType = (file.type as string) || 'application/octet-stream';

    if (!isLikelyImage(buffer)) {
      return NextResponse.json({ error: 'invalid-image' }, { status: 400 });
    }

    const key = `${Date.now()}-${sanitizeUploadFilename(file.name || 'upload')}`;
    const path = `${folder}/${key}`;
    if (!isSafeImagePath(path)) {
      return NextResponse.json({ error: 'invalid-folder' }, { status: 400 });
    }

    // Determine storage bucket name. Prefer explicit env var, then admin app config.
    const appOptions = admin.app().options as
      { storageBucket?: string } | undefined;
    const bucketName = getStorageBucketName(appOptions);
    if (!bucketName) {
      return NextResponse.json(
        {
          error: 'no-storage-bucket-configured',
          detail:
            'Set FIREBASE_STORAGE_BUCKET env or configure default storage bucket in firebase admin app.',
        },
        { status: 500 },
      );
    }
    const bucket = admin.storage().bucket(bucketName);
    const fileRef = bucket.file(path);

    await fileRef.save(buffer, {
      metadata: { contentType, cacheControl: 'public, max-age=31536000' },
    });

    // Try to make the file public (best for preview) and build a public URL.
    const { publicUrl, signedUrl } = await getImageStorageUrls(
      fileRef,
      bucketName,
      path,
    );

    // Attempt to delete previous file if provided and different
    if (previous && previous !== path) {
      if (!isSafeImagePath(previous)) {
        return NextResponse.json(
          { error: 'invalid-previous-path' },
          { status: 400 },
        );
      }
      try {
        const prevRef = bucket.file(previous);
        const [exists] = await prevRef.exists();
        if (exists) await prevRef.delete();
      } catch (e) {
        console.warn('failed to delete previous file', e);
      }
    }

    // If caller provided a teamId, update the teamMembers doc atomically.
    // If the Firestore update fails, delete the uploaded file to avoid orphaned files.
    const teamId = form.get('teamId')?.toString();
    if (teamId) {
      try {
        const docRef = admin.firestore().doc(`teamMembers/${teamId}`);
        await docRef.update({
          image: publicUrl || signedUrl || null,
          imagePath: path,
        });
      } catch (e) {
        console.warn(
          'failed to update team member doc, rolling back uploaded file',
          e,
        );
        try {
          await fileRef.delete();
        } catch (delErr) {
          console.error('rollback delete failed', delErr);
        }
        return NextResponse.json(
          { ok: false, error: 'firestore-update-failed', detail: String(e) },
          { status: 500 },
        );
      }
    }

    return NextResponse.json({
      ok: true,
      path: path,
      url: signedUrl,
      urlPublic: publicUrl,
    });
  } catch (err) {
    console.error('team-image upload error', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.ok)
      return NextResponse.json(
        { error: 'unauthorized', reason: auth.reason },
        { status: 401 },
      );

    const body = await req.json();
    const { path } = body as { path?: string };
    if (!path)
      return NextResponse.json({ error: 'missing path' }, { status: 400 });
    if (!isSafeImagePath(path)) {
      return NextResponse.json({ error: 'invalid path' }, { status: 400 });
    }

    const bucket = admin.storage().bucket();
    const file = bucket.file(path);
    const [exists] = await file.exists();
    if (!exists)
      return NextResponse.json({
        ok: true,
        deleted: false,
        reason: 'not-found',
      });
    await file.delete();
    return NextResponse.json({ ok: true, deleted: true });
  } catch (err) {
    console.error('team-image delete error', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
