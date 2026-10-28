import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requireAdmin, authFailureResponse } from '@/lib/server-auth';
import { checkWindow } from '@/lib/rate-limit-in-memory';
import { logAdminAction } from '@/lib/server-audit-log';
import { eraseAccount } from '@/lib/account-erasure';
import { adminAuth } from '@/lib/firebase-admin';

export const runtime = 'nodejs';

const DELETE_LIMIT = 20;
const DELETE_WINDOW_MS = 60 * 60 * 1000;
const UID_RE = /^[A-Za-z0-9_-]{1,128}$/;

/**
 * DELETE /api/admin/members?uid=...
 *
 * Admin erasure of a member's account, removing exactly what self-service
 * deletion removes (CV, consent record, registrations and files, profile, sign-in;
 * see lib/account-erasure). Audit-logged. Admins delete their own account from
 * My Account instead, so a slip in the Members table can't lock them out.
 */
export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return authFailureResponse(auth.reason);
  const adminUid = auth.session.uid;

  if (
    !checkWindow(
      `admin-member-delete:${adminUid}`,
      DELETE_LIMIT,
      DELETE_WINDOW_MS,
    ).allowed
  ) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const uid = new URL(req.url).searchParams.get('uid') || '';
  if (!UID_RE.test(uid)) {
    return NextResponse.json({ error: 'Invalid member id' }, { status: 400 });
  }
  if (uid === adminUid) {
    return NextResponse.json(
      { error: 'Delete your own account from My Account instead.' },
      { status: 400 },
    );
  }

  try {
    // Keep the hierarchy: only a superAdmin may erase an admin or superAdmin.
    const target = await adminAuth.getUser(uid).catch((err: unknown) => {
      if ((err as { code?: unknown })?.code === 'auth/user-not-found')
        return null;
      throw err;
    });
    const targetIsAdmin =
      target?.customClaims?.admin === true ||
      target?.customClaims?.superAdmin === true;
    if (targetIsAdmin && !auth.session.isSuperAdmin) {
      return NextResponse.json(
        { error: 'Only a superAdmin can delete an admin account.' },
        { status: 403 },
      );
    }

    await eraseAccount(uid);
    const forwarded = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
    await logAdminAction({
      action: 'remove',
      adminUid,
      path: `users/${uid}`,
      ip: forwarded || undefined,
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('admin member deletion error', err);
    return NextResponse.json(
      { error: 'Deleting the member failed. Please try again.' },
      { status: 500 },
    );
  }
}
