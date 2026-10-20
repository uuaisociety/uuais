import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requireAdmin, authFailureResponse } from '@/lib/server-auth';
import { checkWindow } from '@/lib/rate-limit-in-memory';
import { getStorageBucketName } from '@/lib/image-upload';
import { logAdminAction } from '@/lib/server-audit-log';
import '@/lib/firebase-admin';
import admin from 'firebase-admin';

const DOWNLOAD_LIMIT = 120;
const DOWNLOAD_WINDOW_MS = 60_000;

// Only allow paths under the given prefix, so a compromised admin session can't read arbitrary bucket files.
export function isSafeStoragePath(path: string, prefix: string): boolean {
  if (!path.startsWith(prefix)) return false;
  const segments = path.split('/');
  if (segments.some((s) => s === '..' || s === '.' || s === '')) return false;
  return (
    !path.split('').some((c) => c.charCodeAt(0) < 32) && !path.includes('\\')
  );
}

/** Streams a Storage file over an admin-only, same-origin route. */
export async function handleAdminFileDownload(
  req: NextRequest,
  prefix: string,
): Promise<NextResponse> {
  try {
    const auth = await requireAdmin(req);
    if (!auth.ok) return authFailureResponse(auth.reason);

    const limit = checkWindow(
      `file-download:${auth.session.uid}`,
      DOWNLOAD_LIMIT,
      DOWNLOAD_WINDOW_MS,
    );
    if (!limit.allowed) {
      return NextResponse.json(
        {
          error: 'rate limit exceeded',
          resetAt: new Date(limit.resetAt).toISOString(),
        },
        { status: 429 },
      );
    }

    const path = new URL(req.url).searchParams.get('path') || '';
    if (!path || !isSafeStoragePath(path, prefix)) {
      return NextResponse.json({ error: 'invalid path' }, { status: 400 });
    }

    const appOptions = admin.app().options as
      { storageBucket?: string } | undefined;
    const bucketName = getStorageBucketName(appOptions);
    const bucket = bucketName
      ? admin.storage().bucket(bucketName)
      : admin.storage().bucket();
    const file = bucket.file(path);

    const [exists] = await file.exists();
    if (!exists)
      return NextResponse.json({ error: 'not found' }, { status: 404 });

    const [metadata] = await file.getMetadata();
    const [buffer] = await file.download();
    const name = path.split('/').pop() || 'file.pdf';

    const forwarded = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
    await logAdminAction({
      action: 'download',
      adminUid: auth.session.uid,
      path,
      ip: forwarded || undefined,
    });

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type':
          typeof metadata.contentType === 'string'
            ? metadata.contentType
            : 'application/pdf',
        'Content-Disposition': `attachment; filename="${name.replace(/[^a-zA-Z0-9_.-]/g, '_')}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    console.error('file download error', err);
    return NextResponse.json({ error: 'internal error' }, { status: 500 });
  }
}
