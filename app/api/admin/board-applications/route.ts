import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requireAdmin, authFailureResponse } from '@/lib/server-auth';
import { adminDb } from '@/lib/firebase-admin';
import admin from 'firebase-admin';
import { isSafeStoragePath } from '@/lib/admin-file-download';
import { logAdminAction } from '@/lib/server-audit-log';

const ID_RE = /^[A-Za-z0-9_-]{1,128}$/;

// DELETE body: { id } — deletes a board application and its CV/cover files.
// Audit-logged; clients can't delete board applications directly.
export async function DELETE(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.ok) return authFailureResponse(auth.reason);

    const body = await req.json().catch(() => null);
    const { id } = (body ?? {}) as { id?: unknown };
    if (typeof id !== 'string' || !ID_RE.test(id))
      return NextResponse.json({ error: 'invalid id' }, { status: 400 });

    const appRef = adminDb.collection('boardApplications').doc(id);
    const appSnap = await appRef.get();
    if (appSnap.exists) {
      const data = appSnap.data() as {
        cv?: { path?: unknown } | null;
        coverFile?: { path?: unknown } | null;
      };
      // Best-effort file cleanup, and only of board-application uploads.
      const bucket = admin.storage().bucket();
      for (const path of [data.cv?.path, data.coverFile?.path]) {
        if (
          typeof path !== 'string' ||
          !isSafeStoragePath(path, 'board-applications/')
        )
          continue;
        try {
          await bucket.file(path).delete({ ignoreNotFound: true });
        } catch (storageErr) {
          console.error('failed to delete board application file', storageErr);
        }
      }
    }

    await appRef.delete();
    const forwarded = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
    await logAdminAction({
      action: 'remove',
      adminUid: auth.session.uid,
      path: `boardApplications/${id}`,
      ip: forwarded || undefined,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('board-applications delete error', err);
    return NextResponse.json({ error: 'internal error' }, { status: 500 });
  }
}
