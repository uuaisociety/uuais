import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requireAdmin, authFailureResponse } from '@/lib/server-auth';
import { adminDb } from '@/lib/firebase-admin';
import admin from 'firebase-admin';

function safeKeyPart(s: string): string {
  return encodeURIComponent(s);
}

// DELETE body: { id, campaignId, emailNormalized? } — deletes app + lock/limits docs (uid, fallback email) + resume from Storage.
export async function DELETE(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.ok) return authFailureResponse(auth.reason);

    const body = await req.json();
    const { id, campaignId, emailNormalized } = body as { id?: string; campaignId?: string; emailNormalized?: string };
    if (!id || !campaignId) return NextResponse.json({ error: 'missing id/campaignId' }, { status: 400 });

    // Derive the identity that keyed the lock/limits docs at create time.
    let identity = emailNormalized || '';
    const appRef = adminDb.collection('teamApplications').doc(id);
    const appSnap = await appRef.get();
    if (appSnap.exists) {
      const data = appSnap.data() as { uid?: string; emailNormalized?: string; resume?: { path?: string } | null };
      if (typeof data.uid === 'string' && data.uid) identity = data.uid;
      if (!identity && typeof data.emailNormalized === 'string') identity = data.emailNormalized;

      // Best-effort resume cleanup from Cloud Storage.
      if (data.resume?.path) {
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

    const lockKey = identity ? `${safeKeyPart(identity)}__${safeKeyPart(campaignId)}` : null;
    const deletes: Promise<unknown>[] = [appRef.delete()];
    if (lockKey) {
      deletes.push(adminDb.collection('applicationCampaignLocks').doc(lockKey).delete());
      deletes.push(adminDb.collection('applicationUserLimits').doc(safeKeyPart(identity!)).delete());
    }
    await Promise.all(deletes);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('team-applications delete error', err);
    return NextResponse.json({ error: 'internal error' }, { status: 500 });
  }
}
