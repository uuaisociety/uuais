import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requireAdmin, authFailureResponse } from '@/lib/server-auth';
import { readBoundedRequest } from '@/lib/bounded-request-body';
import { checkWindow } from '@/lib/rate-limit-in-memory';
import { logAdminAction, type AdminAuditEntry } from '@/lib/server-audit-log';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

export const runtime = 'nodejs';

const MAX_BODY_BYTES = 16 * 1024;
const EDIT_LIMIT = 120;
const EDIT_WINDOW_MS = 60 * 60 * 1000;
const UID_RE = /^[A-Za-z0-9_-]{1,128}$/;

// Profile fields an admin may edit, with each one's max length (strings) or
// type. The member's email and consent choices are not here: only the member
// may change those (see memberOwnedFields in lib/firestore.rules).
const STRING_FIELDS: Record<string, number> = {
  displayName: 100,
  name: 100,
  program: 150,
  photoURL: 1000,
  studentStatus: 20,
  campus: 20,
  university: 20,
  gender: 50,
  linkedin: 500,
  github: 500,
  website: 500,
  bio: 2000,
  heardOfUs: 500,
};
const BOOLEAN_FIELDS = new Set([
  'isMember',
  'lookingForJob',
  'unsubscribedFromEmails',
]);

function validValue(key: string, value: unknown): boolean {
  if (key in STRING_FIELDS)
    return typeof value === 'string' && value.length <= STRING_FIELDS[key];
  if (BOOLEAN_FIELDS.has(key)) return typeof value === 'boolean';
  if (key === 'expectedGraduationYear')
    return (
      value === null ||
      (Number.isInteger(value) &&
        (value as number) >= 1950 &&
        (value as number) <= 2100)
    );
  return false;
}

/**
 * PATCH /api/admin/members/profile  { uid, update: { field: value } }
 *
 * Admin edit of a member profile; logged with the changed field names (never
 * their values). Only a superAdmin may edit an admin's profile, and an admin
 * may suppress email to a member but never undo the member's unsubscribe.
 */
export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return authFailureResponse(auth.reason);
  const adminUid = auth.session.uid;
  if (
    !checkWindow(`admin-member-edit:${adminUid}`, EDIT_LIMIT, EDIT_WINDOW_MS)
      .allowed
  )
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

  const bounded = await readBoundedRequest(req, MAX_BODY_BYTES);
  if (!bounded)
    return NextResponse.json({ error: 'Request too large' }, { status: 413 });
  let body: unknown;
  try {
    body = await bounded.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const { uid, update } = (body && typeof body === 'object' ? body : {}) as {
    uid?: unknown;
    update?: unknown;
  };
  if (typeof uid !== 'string' || !UID_RE.test(uid))
    return NextResponse.json({ error: 'Invalid member id' }, { status: 400 });
  if (!update || typeof update !== 'object' || Array.isArray(update))
    return NextResponse.json({ error: 'Invalid update' }, { status: 400 });
  for (const [key, value] of Object.entries(update)) {
    if (!validValue(key, value))
      return NextResponse.json(
        { error: `Field ${key} can't be set to that value` },
        { status: 400 },
      );
  }

  try {
    // Keep the hierarchy: only a superAdmin may edit an admin or superAdmin.
    const target = await adminAuth.getUser(uid).catch((err: unknown) => {
      if ((err as { code?: unknown })?.code === 'auth/user-not-found')
        return null;
      throw err;
    });
    const targetIsAdmin =
      target?.customClaims?.admin === true ||
      target?.customClaims?.superAdmin === true;
    if (targetIsAdmin && !auth.session.isSuperAdmin)
      return NextResponse.json(
        { error: 'Only a superAdmin can edit an admin account.' },
        { status: 403 },
      );

    const ref = adminDb.collection('users').doc(uid);
    const snap = await ref.get();
    // Never create a profile: an erased member must stay erased.
    if (!snap.exists)
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    const current = snap.data() ?? {};

    const changed = Object.entries(update).filter(
      ([key, value]) => current[key] !== value,
    );
    if (
      current.unsubscribedFromEmails === true &&
      changed.some(([k, v]) => k === 'unsubscribedFromEmails' && v === false)
    )
      return NextResponse.json(
        { error: 'Only the member can resubscribe to emails.' },
        { status: 403 },
      );
    if (changed.length === 0) return NextResponse.json({ success: true });

    const forwarded = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
    const entry: AdminAuditEntry = {
      action: 'update',
      adminUid,
      path: `users/${uid}`,
      fields: changed.map(([k]) => k),
      ip: forwarded || undefined,
    };
    // Logged first (and refused if that fails), so no edit goes unrecorded.
    await logAdminAction(entry, { required: true });
    await ref.update({
      ...Object.fromEntries(changed),
      updatedAt: new Date().toISOString(),
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('admin member edit error', err);
    return NextResponse.json(
      { error: 'Saving the member failed. Please try again.' },
      { status: 500 },
    );
  }
}
