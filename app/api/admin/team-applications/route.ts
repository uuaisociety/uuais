import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requireAdmin, authFailureResponse } from '@/lib/server-auth';
import { adminDb } from '@/lib/firebase-admin';
import admin from 'firebase-admin';
import { isSafeStoragePath } from '@/lib/admin-file-download';
import { logAdminAction } from '@/lib/server-audit-log';

const ID_RE = /^[A-Za-z0-9_-]{1,128}$/;

function safeKeyPart(s: string): string {
  return encodeURIComponent(s);
}

// DELETE body: { id } — deletes app + lock/limits docs (uid, fallback email) + resume from Storage.
// The lock/limits keys come from the stored application only, never the request body.
export async function DELETE(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.ok) return authFailureResponse(auth.reason);

    const body = await req.json();
    const { id } = (body ?? {}) as { id?: unknown };
    if (typeof id !== 'string' || !ID_RE.test(id))
      return NextResponse.json({ error: 'invalid id' }, { status: 400 });

    // Derive the identity and campaign that keyed the lock/limits docs at create time.
    let identity = '';
    let campaignId = '';
    const appRef = adminDb.collection('teamApplications').doc(id);
    const appSnap = await appRef.get();
    if (appSnap.exists) {
      const data = appSnap.data() as {
        uid?: string;
        emailNormalized?: string;
        campaignId?: string;
        resume?: { path?: string } | null;
      };
      if (typeof data.uid === 'string' && data.uid) identity = data.uid;
      if (!identity && typeof data.emailNormalized === 'string')
        identity = data.emailNormalized;
      if (typeof data.campaignId === 'string') campaignId = data.campaignId;

      // Best-effort resume cleanup from Cloud Storage, and only of a team-application upload.
      if (
        typeof data.resume?.path === 'string' &&
        isSafeStoragePath(data.resume.path, 'team-applications/')
      ) {
        try {
          const bucket = admin.storage().bucket();
          const gfile = bucket.file(data.resume.path);
          const [exists] = await gfile.exists();
          if (exists) await gfile.delete();
        } catch (storageErr) {
          console.error('failed to delete resume from storage', storageErr);
        }
      }
    }

    const deletes: Promise<unknown>[] = [appRef.delete()];
    if (identity && campaignId) {
      const lockKey = `${safeKeyPart(identity)}__${safeKeyPart(campaignId)}`;
      deletes.push(
        adminDb.collection('applicationCampaignLocks').doc(lockKey).delete(),
      );
      deletes.push(
        adminDb
          .collection('applicationUserLimits')
          .doc(safeKeyPart(identity))
          .delete(),
      );
    }
    await Promise.all(deletes);
    const forwarded = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
    await logAdminAction({
      action: 'remove',
      adminUid: auth.session.uid,
      path: `teamApplications/${id}`,
      ip: forwarded || undefined,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('team-applications delete error', err);
    return NextResponse.json({ error: 'internal error' }, { status: 500 });
  }
}
