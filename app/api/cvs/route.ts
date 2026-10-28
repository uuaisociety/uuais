import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { authFailureResponse, requireAuth } from '@/lib/server-auth';
import { canReviewCvs } from '@/lib/partner-access';
import { adminDb } from '@/lib/firebase-admin';
import { checkWindow } from '@/lib/rate-limit-in-memory';
import { logAdminAction } from '@/lib/server-audit-log';
import { cvContentDisposition } from '@/lib/cv-file';
import admin from 'firebase-admin';

const DOWNLOAD_LIMIT = 120;
const DOWNLOAD_WINDOW_MS = 60_000;
const UID_RE = /^[A-Za-z0-9_-]{1,128}$/;

/**
 * GET /api/cvs?uid=... — streams a member's shared CV as Firstname_Lastname.pdf.
 * Admins and partner accounts only. The file is served only while the member's
 * consent record (cvs/{uid}) exists, and every download is audit-logged.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth.ok) return authFailureResponse(auth.reason);
    const { session } = auth;
    if (!(await canReviewCvs(session))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const limit = checkWindow(
      `cv-download:${session.uid}`,
      DOWNLOAD_LIMIT,
      DOWNLOAD_WINDOW_MS,
    );
    if (!limit.allowed) {
      return NextResponse.json(
        { error: 'Too many downloads. Please try again in a minute.' },
        { status: 429 },
      );
    }

    const uid = new URL(req.url).searchParams.get('uid') || '';
    if (!UID_RE.test(uid)) {
      return NextResponse.json({ error: 'Invalid member id' }, { status: 400 });
    }

    // The consent record gates access: no record, no file, even if one lingers.
    const record = await adminDb.collection('cvs').doc(uid).get();
    const path = `cvs/${uid}/cv.pdf`;
    if (!record.exists || record.get('path') !== path) {
      return NextResponse.json({ error: 'CV not found' }, { status: 404 });
    }

    const file = admin.storage().bucket().file(path);
    const [exists] = await file.exists();
    if (!exists)
      return NextResponse.json({ error: 'CV not found' }, { status: 404 });

    const profile = await adminDb.collection('users').doc(uid).get();
    // Sharing is a member benefit: a revoked or erased member's CV isn't served.
    if (profile.get('isMember') !== true)
      return NextResponse.json({ error: 'CV not found' }, { status: 404 });

    // The privacy policy promises every download is logged, so no log, no file.
    const forwarded = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
    try {
      await logAdminAction(
        {
          action: 'download',
          adminUid: session.uid,
          path,
          ip: forwarded || undefined,
          ...(session.isAdmin
            ? {}
            : { role: 'partner' as const, email: session.email }),
        },
        { required: true },
      );
    } catch {
      return NextResponse.json(
        { error: 'Downloads are temporarily unavailable. Please try again.' },
        { status: 503 },
      );
    }
    const [buffer] = await file.download();

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': cvContentDisposition(
          profile.get('name') || profile.get('displayName'),
        ),
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
        // Belt and braces should a browser ever render it in our origin anyway.
        'Content-Security-Policy': 'sandbox',
      },
    });
  } catch (err) {
    console.error('cv download error', err);
    return NextResponse.json({ error: 'internal error' }, { status: 500 });
  }
}
