import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getTokens } from 'next-firebase-auth-edge';
import { authConfig } from '@/lib/auth-config';
import { adminDb } from '@/lib/firebase-admin';
import admin from 'firebase-admin';

async function authorizeRequest(req: NextRequest) {
  try {
    const tokens = await getTokens(req.cookies, authConfig);
    if (!tokens) return { ok: false, reason: 'no-auth' };
    const isAdmin = tokens.decodedToken.admin === true || tokens.decodedToken.superAdmin === true;
    if (!isAdmin) return { ok: false, reason: 'not-admin' };
    return { ok: true };
  } catch (err) {
    console.warn('getTokens failed', err);
    return { ok: false, reason: 'invalid-token' };
  }
}

function safeKeyPart(s: string): string {
  return encodeURIComponent(s);
}

/**
 * DELETE /api/admin/team-applications
 *
 * Body: { id, campaignId, emailNormalized? }
 *
 * Permanently deletes an application together with its campaign lock and
 * cooldown limit docs (keyed by the stored uid, falling back to email) and its
 * uploaded resume from Cloud Storage.
 */
export async function DELETE(req: NextRequest) {
  try {
    const auth = await authorizeRequest(req);
    if (!auth.ok) return NextResponse.json({ error: 'unauthorized', reason: auth.reason }, { status: auth.reason === 'not-admin' ? 403 : 401 });

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
    return NextResponse.json({ error: 'internal error', detail: err instanceof Error ? err.message : 'unknown' }, { status: 500 });
  }
}
