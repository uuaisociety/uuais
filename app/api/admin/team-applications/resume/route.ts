import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requireAdmin, authFailureResponse } from '@/lib/server-auth';
import { checkWindow } from '@/lib/rate-limit-in-memory';
import '@/lib/firebase-admin';
import admin from 'firebase-admin';

const RESUME_DOWNLOAD_LIMIT = 120;
const RESUME_DOWNLOAD_WINDOW_MS = 60_000;

// Only allow resume paths under the team-applications prefix, so a compromised admin session can't read arbitrary bucket files.
function isSafeResumePath(path: string): boolean {
  if (!path.startsWith('team-applications/')) return false;
  const segments = path.split('/');
  if (segments.some((s) => s === '..' || s === '.' || s === '')) return false;
  return !path.split('').some((c) => c.charCodeAt(0) < 32) && !path.includes('\\');
}

// GET /api/admin/team-applications/resume?path=team-applications/... — streams a resume from Storage. Admin-only, same-origin so no CORS.
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.ok) return authFailureResponse(auth.reason);

    const limit = checkWindow(`resume:${auth.session.uid}`, RESUME_DOWNLOAD_LIMIT, RESUME_DOWNLOAD_WINDOW_MS);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: 'rate limit exceeded', resetAt: new Date(limit.resetAt).toISOString() },
        { status: 429 }
      );
    }

    const path = new URL(req.url).searchParams.get('path') || '';
    if (!path || !isSafeResumePath(path)) {
      return NextResponse.json({ error: 'invalid path' }, { status: 400 });
    }

    const appOptions = admin.app().options as { storageBucket?: string } | undefined;
    const bucketName = process.env.FIREBASE_STORAGE_BUCKET || process.env.GCLOUD_STORAGE_BUCKET || (appOptions && appOptions.storageBucket) || process.env.ADMIN_STORAGE_BUCKET;
    const bucket = bucketName ? admin.storage().bucket(bucketName) : admin.storage().bucket();
    const file = bucket.file(path);

    const [exists] = await file.exists();
    if (!exists) return NextResponse.json({ error: 'not found' }, { status: 404 });

    const [metadata] = await file.getMetadata();
    const [buffer] = await file.download();
    const name = path.split('/').pop() || 'resume.pdf';
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': typeof metadata.contentType === 'string' ? metadata.contentType : 'application/pdf',
        'Content-Disposition': `attachment; filename="${name.replace(/[^a-zA-Z0-9_.-]/g, '_')}"`,
        'Cache-Control': 'private, max-age=60',
      },
    });
  } catch (err) {
    console.error('resume download error', err);
    return NextResponse.json({ error: 'internal error' }, { status: 500 });
  }
}
