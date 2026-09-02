import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { getTokens } from 'next-firebase-auth-edge';
import { authConfig } from '@/lib/auth-config';

export interface ServerSession {
  uid: string;
  isAdmin: boolean;
  isSuperAdmin: boolean;
}

export type AuthFailureReason = 'no-auth' | 'invalid-token' | 'not-admin';

export type AuthResult =
  | { ok: true; session: ServerSession }
  | { ok: false; reason: AuthFailureReason };

async function resolveSession(req: NextRequest): Promise<AuthResult> {
  try {
    const tokens = await getTokens(req.cookies, authConfig);
    if (!tokens) return { ok: false, reason: 'no-auth' };
    const decoded = tokens.decodedToken;
    return {
      ok: true,
      session: {
        uid: decoded.uid,
        isAdmin: decoded.admin === true || decoded.superAdmin === true,
        isSuperAdmin: decoded.superAdmin === true,
      },
    };
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
  if (result.ok && !result.session.isAdmin) return { ok: false, reason: 'not-admin' };
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
    const decoded = tokens.decodedToken;
    return {
      uid: decoded.uid,
      isAdmin: decoded.admin === true || decoded.superAdmin === true,
      isSuperAdmin: decoded.superAdmin === true,
    };
  } catch {
    return null;
  }
}

export function authFailureResponse(reason: AuthFailureReason): NextResponse {
  if (reason === 'not-admin') {
    return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
