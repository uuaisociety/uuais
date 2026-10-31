import type { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/server-auth';

export type MemberAuth =
  { ok: true; uid: string } | { ok: false; reason: string; detail?: string };

/**
 * Authorize a request as a signed-in member: every signed-in user counts as a member (self-declared at registration), so only the session token is verified.
 * Goes through requireAuth so an expired token (a disabled, erased or revoked account) is refused too.
 */
export async function authorizeMember(req: NextRequest): Promise<MemberAuth> {
  const auth = await requireAuth(req);
  if (!auth.ok) return { ok: false, reason: auth.reason };
  return { ok: true, uid: auth.session.uid };
}
