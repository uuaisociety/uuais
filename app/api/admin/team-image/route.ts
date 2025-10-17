import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';

if (!admin.apps.length) {
  try {
    const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || process.env.FIREBASE_STORAGE_BUCKET;
    const projectId = process.env.FIREBASE_PROJECT_ID;
    if (credPath) {
      const abs = path.isAbsolute(credPath) ? credPath : path.resolve(process.cwd(), credPath);
      if (fs.existsSync(abs)) {
        const serviceAccount = JSON.parse(fs.readFileSync(abs, 'utf8'));
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          storageBucket: storageBucket,
          projectId: projectId
        });
      } else {
        // fall back to default initialization but pass storageBucket if available
        admin.initializeApp({
          projectId,
          storageBucket,
        });      
    }
    } else {
      admin.initializeApp({
        projectId,
        storageBucket,
      });
    }
  } catch (e) {
    console.warn('firebase-admin init failed', e);
  }
}
//   const tokenRes = await getIdTokenResult(u, true);
//   const tokenClaims = (tokenRes.claims || {}) as Record<string, unknown>;
//   setClaims(tokenClaims);
//   setIsAdmin(Boolean(tokenClaims.admin));
async function authorizeRequest(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return { ok: false, reason: 'no-auth' };
  const idToken = authHeader.slice('Bearer '.length);
  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    if (decoded && decoded.admin === true) return { ok: true, uid: decoded.uid };
    return { ok: false, reason: 'not-admin' };
  } catch (err) {
    console.warn('verifyIdToken failed', err);
    // attempt to decode without verification to provide diagnostic info (dev only)
    return { ok: false, reason: 'invalid-token', detail: String(err instanceof Error ? err.message : err) };
  }
}

function sanitizeFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9_.-]/g, '_');
}

function isLikelyImage(buf: Buffer, contentType?: string) {
  if (!buf || buf.length < 4) return false;
  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return true;
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return true;
  // GIF: 47 49 46 38
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38) return true;
  // WebP: 'RIFF' .... 'WEBP'
  if (buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46) {
    // check for WEBP in bytes 8-11
    if (buf.length > 12 && buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50) return true;
  }
  // Fallback to contentType starting with image/
  if (contentType && contentType.startsWith('image/')) return true;
  return false;
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authorizeRequest(req);
    if (!auth.ok) return NextResponse.json({ error: 'unauthorized', reason: auth.reason, detail: auth.detail }, { status: 401 });

    const form = await req.formData();
    const file = form.get('file') as File | null;
    const previous = form.get('previousPath')?.toString();
    const folder = form.get('folder')?.toString() || 'uploads';

    if (!file) return NextResponse.json({ error: 'missing file' }, { status: 400 });

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const contentType = (file.type as string) || 'application/octet-stream';

    if (!isLikelyImage(buffer, contentType)) {
      return NextResponse.json({ error: 'invalid-image' }, { status: 400 });
    }

    const key = `${Date.now()}-${sanitizeFilename(((file as File).name) || 'upload')}`;
    const path = `${folder}/${key}`;

    // Determine storage bucket name. Prefer explicit env var, then admin app config.
    const appOptions = admin.app().options as { storageBucket?: string } | undefined;
    const bucketName = process.env.FIREBASE_STORAGE_BUCKET || process.env.GCLOUD_STORAGE_BUCKET || (appOptions && appOptions.storageBucket) || process.env.ADMIN_STORAGE_BUCKET;
    if (!bucketName) {
      return NextResponse.json({ error: 'no-storage-bucket-configured', detail: 'Set FIREBASE_STORAGE_BUCKET env or configure default storage bucket in firebase admin app.' }, { status: 500 });
    }
    const bucket = admin.storage().bucket(bucketName);
    const fileRef = bucket.file(path);

    await fileRef.save(buffer, { metadata: { contentType, cacheControl: 'public, max-age=31536000' } });

    // Try to generate a signed url (long expiration). As a fallback, rely on storage path.
    let url: string | null = null;
    try {
      const [signed] = await fileRef.getSignedUrl({ action: 'read', expires: '03-09-2491' });
      url = signed;
    } catch (e) {
      console.warn('getSignedUrl failed', e);
    }

    // Attempt to delete previous file if provided and different
    if (previous && previous !== path) {
      try {
        const prevRef = bucket.file(previous);
        const [exists] = await prevRef.exists();
        if (exists) await prevRef.delete();
      } catch (e) {
        console.warn('failed to delete previous file', e);
      }
    }

    return NextResponse.json({ ok: true, path, url });
  } catch (err) {
    console.error('team-image upload error', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await authorizeRequest(req);
    if (!auth.ok) return NextResponse.json({ error: 'unauthorized', reason: auth.reason }, { status: 401 });

    const body = await req.json();
    const { path } = body as { path?: string };
    if (!path) return NextResponse.json({ error: 'missing path' }, { status: 400 });

    const bucket = admin.storage().bucket();
    const file = bucket.file(path);
    const [exists] = await file.exists();
    if (!exists) return NextResponse.json({ ok: true, deleted: false, reason: 'not-found' });
    await file.delete();
    return NextResponse.json({ ok: true, deleted: true });
  } catch (err) {
    console.error('team-image delete error', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
