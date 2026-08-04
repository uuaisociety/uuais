import { getTokens } from 'next-firebase-auth-edge';
import type { NextRequest } from 'next/server';
import { authConfig } from '@/lib/auth-config';
import '@/lib/firebase-admin';
import admin from 'firebase-admin';

export type MemberAuth = { ok: true; uid: string } | { ok: false; reason: string; detail?: string };

/**
 * Authorize a request as a signed-in member. Admins always pass; other signed-in
 * users must have `isMember == true` on their `/users/{uid}` profile.
 */
export async function authorizeMember(req: NextRequest): Promise<MemberAuth> {
  try {
    const tokens = await getTokens(req.cookies, authConfig);
    if (!tokens) return { ok: false, reason: 'no-auth' };
    const uid = tokens.decodedToken.uid;
    if (tokens.decodedToken.admin === true || tokens.decodedToken.superAdmin === true) {
      return { ok: true, uid };
    }
    const snap = await admin.firestore().doc(`users/${uid}`).get();
    const profile = snap.exists ? snap.data() : null;
    if (!profile || profile.isMember !== true) return { ok: false, reason: 'not-member' };
    return { ok: true, uid };
  } catch (err) {
    console.warn('getTokens failed', err);
    return { ok: false, reason: 'invalid-token', detail: String(err instanceof Error ? err.message : err) };
  }
}
