import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { getTokens } from 'next-firebase-auth-edge';
import { authConfig } from '@/lib/auth-config';

export interface ServerSession {
  uid: string;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  /** Sign-in email, used to match the partner allowlist (see lib/partner-access). */
  email?: string;
  emailVerified: boolean;
}

export type AuthFailureReason = 'no-auth' | 'invalid-token' | 'not-admin';

export type AuthResult =
  | { ok: true; session: ServerSession }
  | { ok: false; reason: AuthFailureReason };

type DecodedToken = NonNullable<
  Awaited<ReturnType<typeof getTokens>>
>['decodedToken'];

/**
 * getTokens only checks the cookie's signature and decodes the ID token; it does
 * not check expiry. The proxy refreshes a valid session's token before the route
 * runs, so a token that is still expired here means the refresh failed (account
 * deleted, disabled or revoked): treat it as signed out instead of trusting its
 * stale claims (e.g. a demoted admin).
 */
function toSession(decoded: DecodedToken): ServerSession | null {
  // Firebase ID tokens always carry exp; only an expired one is rejected.
  if (typeof decoded.exp === 'number' && decoded.exp * 1000 <= Date.now())
    return null;
  return {
    uid: decoded.uid,
    isAdmin: decoded.admin === true || decoded.superAdmin === true,
    isSuperAdmin: decoded.superAdmin === true,
    email: decoded.email,
    emailVerified: decoded.email_verified === true,
  };
}

async function resolveSession(req: NextRequest): Promise<AuthResult> {
  try {
    const tokens = await getTokens(req.cookies, authConfig);
    if (!tokens) return { ok: false, reason: 'no-auth' };
    const session = toSession(tokens.decodedToken);
    if (!session) return { ok: false, reason: 'invalid-token' };
    return { ok: true, session };
  } catch (err) {
    console.warn('getTokens failed', err);
    return { ok: false, reason: 'invalid-token' };
  }
}

export async function requireAuth(req: NextRequest): Promise<AuthResult> {
  return resolveSession(req);
}

export async function requireAdmin(req: NextRequest): Promise<AuthResult> {
  const result = await resolveSession(req);
  if (result.ok && !result.session.isAdmin)
    return { ok: false, reason: 'not-admin' };
  return result;
}

/**
 * Resolves the session inside a server component, where there is no NextRequest to
 * read cookies from. Returns null when nobody is signed in.
 */
export async function getServerSession(): Promise<ServerSession | null> {
  try {
    const tokens = await getTokens(await cookies(), authConfig);
    if (!tokens) return null;
    return toSession(tokens.decodedToken);
  } catch {
    return null;
  }
}

export function authFailureResponse(reason: AuthFailureReason): NextResponse {
  if (reason === 'not-admin') {
    return NextResponse.json(
      { error: 'Forbidden: Admin access required' },
      { status: 403 },
    );
  }
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
