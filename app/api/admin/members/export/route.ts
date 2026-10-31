import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requireAdmin, authFailureResponse } from '@/lib/server-auth';
import { readBoundedRequest } from '@/lib/bounded-request-body';
import { logAdminAction } from '@/lib/server-audit-log';
import { checkWindow } from '@/lib/rate-limit-in-memory';

const MAX_BODY_BYTES = 1024;
const EXPORT_LIMIT = 30;
const EXPORT_WINDOW_MS = 60 * 60 * 1000;
// Audit path per export, so the trail says which list left the dashboard.
const EXPORT_PATHS = { members: 'users', newsletter: 'users#newsletter' };

/**
 * POST /api/admin/members/export  { kind: 'members' | 'newsletter', count }
 *
 * Records a member-list CSV export. The CSV is built client-side from data the
 * admin already reads; the client only downloads it once this log succeeds.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.ok) return authFailureResponse(auth.reason);
    if (
      !checkWindow(
        `admin-member-export:${auth.session.uid}`,
        EXPORT_LIMIT,
        EXPORT_WINDOW_MS,
      ).allowed
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
    const { kind, count } = (body && typeof body === 'object' ? body : {}) as {
      kind?: unknown;
      count?: unknown;
    };
    if (kind !== 'members' && kind !== 'newsletter')
      return NextResponse.json({ error: 'Invalid kind' }, { status: 400 });
    if (typeof count !== 'number' || !Number.isSafeInteger(count) || count < 0)
      return NextResponse.json({ error: 'Invalid count' }, { status: 400 });

    const forwarded = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
    await logAdminAction(
      {
        action: 'export',
        adminUid: auth.session.uid,
        path: EXPORT_PATHS[kind],
        count,
        ip: forwarded || undefined,
      },
      { required: true },
    );
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('member export log error', err);
    return NextResponse.json(
      { error: 'Failed to log the export' },
      { status: 500 },
    );
  }
}
