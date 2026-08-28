import { getTokens } from 'next-firebase-auth-edge';
import type { NextRequest } from 'next/server';
import { authConfig } from '@/lib/auth-config';

export type MemberAuth = { ok: true; uid: string } | { ok: false; reason: string; detail?: string };

/** Authorize a request as a signed-in member: every signed-in user counts as a member (self-declared at registration), so only the session token is verified. */
export async function authorizeMember(req: NextRequest): Promise<MemberAuth> {
  try {
    const tokens = await getTokens(req.cookies, authConfig);
    if (!tokens) return { ok: false, reason: 'no-auth' };
    return { ok: true, uid: tokens.decodedToken.uid };
  } catch (err) {
    console.warn('getTokens failed', err);
    return { ok: false, reason: 'invalid-token', detail: String(err instanceof Error ? err.message : err) };
  }
}
