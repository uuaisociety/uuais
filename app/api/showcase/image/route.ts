import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import '@/lib/firebase-admin';
import admin from 'firebase-admin';
import { authorizeMember } from '@/lib/member-auth';

function sanitizeFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9_.-]/g, '_');
}

function isLikelyImage(buf: Buffer) {
  if (!buf || buf.length < 4) return false;
  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return true;
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return true;
  // GIF: 47 49 46 38
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38) return true;
  // WebP: 'RIFF' .... 'WEBP'
  if (buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46) {
    if (buf.length > 12 && buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50) return true;
  }
  return false;
}

const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

// Showcase covers always live under this storage prefix; anything outside of it
// (team images, event images, etc.) must not be touchable through this route.
const SHOWCASE_PREFIX = 'showcase/';

function isShowcasePath(p: string) {
  return typeof p === 'string' && p.startsWith(SHOWCASE_PREFIX) && !p.includes('..');
}

function getBucket() {
  const appOptions = admin.app().options as { storageBucket?: string } | undefined;
  const bucketName = process.env.FIREBASE_STORAGE_BUCKET || process.env.GCLOUD_STORAGE_BUCKET || (appOptions && appOptions.storageBucket) || process.env.ADMIN_STORAGE_BUCKET;
  if (!bucketName) throw new Error('no-storage-bucket-configured');
  return admin.storage().bucket(bucketName);
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authorizeMember(req);
    if (!auth.ok) return NextResponse.json({ error: 'unauthorized', reason: auth.reason, detail: auth.detail }, { status: 401 });

    const form = await req.formData();
    const file = form.get('file') as File | null;
    const previous = form.get('previousPath')?.toString();

    if (!file) return NextResponse.json({ error: 'missing file' }, { status: 400 });

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const contentType = (file.type as string) || 'application/octet-stream';

    if (buffer.length === 0 || buffer.length > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: 'invalid-size' }, { status: 400 });
    }

    if (!isLikelyImage(buffer)) {
      return NextResponse.json({ error: 'invalid-image' }, { status: 400 });
    }

    const key = `${Date.now()}-${sanitizeFilename(((file as File).name) || 'upload')}`;
    const path = `${SHOWCASE_PREFIX}${key}`;

    const bucket = getBucket();
    const fileRef = bucket.file(path);
    await fileRef.save(buffer, { metadata: { contentType, cacheControl: 'public, max-age=31536000' } });

    let publicUrl: string | null = null;
    try {
      await fileRef.makePublic();
      const bn = bucket.name;
      publicUrl = `https://storage.googleapis.com/${bn}/${encodeURIComponent(path)}`;
    } catch (e) {
      console.warn('makePublic failed, will try signed url', e);
    }

    let signedUrl: string | null = null;
    try {
      const [signed] = await fileRef.getSignedUrl({ action: 'read', expires: '03-09-2491' });
      signedUrl = signed;
    } catch (e) {
      console.warn('getSignedUrl failed', e);
    }

    // Remove a previous cover image if a different path was supplied.
    // Only ever touch files under the showcase/ prefix.
    if (previous && previous !== path && isShowcasePath(previous)) {
      try {
        const prevRef = bucket.file(previous);
        const [exists] = await prevRef.exists();
        if (exists) await prevRef.delete();
      } catch (e) {
        console.warn('failed to delete previous file', e);
      }
    }

    return NextResponse.json({ ok: true, path, url: signedUrl, urlPublic: publicUrl });
  } catch (err) {
    console.error('showcase image upload error', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await authorizeMember(req);
    if (!auth.ok) return NextResponse.json({ error: 'unauthorized', reason: auth.reason }, { status: 401 });

    const body = await req.json();
    const { path } = body as { path?: string };
    if (!path) return NextResponse.json({ error: 'missing path' }, { status: 400 });
    if (!isShowcasePath(path)) return NextResponse.json({ error: 'invalid path' }, { status: 400 });

    const bucket = getBucket();
    const file = bucket.file(path);
    const [exists] = await file.exists();
    if (!exists) return NextResponse.json({ ok: true, deleted: false, reason: 'not-found' });
    await file.delete();
    return NextResponse.json({ ok: true, deleted: true });
  } catch (err) {
    console.error('showcase image delete error', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
