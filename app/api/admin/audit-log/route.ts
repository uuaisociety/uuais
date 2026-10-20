import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requireAdmin, authFailureResponse } from '@/lib/server-auth';
import { readBoundedRequest } from '@/lib/bounded-request-body';
import { logAdminAction } from '@/lib/server-audit-log';

const MAX_BODY_BYTES = 4 * 1024;
const EVENT_ID_RE = /^[A-Za-z0-9_-]{1,128}$/;

/**
 * POST /api/admin/audit-log
 *
 * Records that an admin exported registration data. The CSV itself is generated
 * client-side; only the audit event is written server-side.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.ok) return authFailureResponse(auth.reason);

    const bounded = await readBoundedRequest(req, MAX_BODY_BYTES);
    if (!bounded)
      return NextResponse.json({ error: 'Request too large' }, { status: 413 });
    let body: unknown;
    try {
      body = await bounded.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    const payload = (body && typeof body === 'object' ? body : {}) as {
      eventId?: unknown;
      count?: unknown;
    };
    const eventId =
      typeof payload.eventId === 'string' && EVENT_ID_RE.test(payload.eventId)
        ? payload.eventId
        : undefined;
    const count =
      typeof payload.count === 'number' && Number.isFinite(payload.count)
        ? payload.count
        : undefined;

    const forwarded = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
    await logAdminAction({
      action: 'export',
      adminUid: auth.session.uid,
      eventId,
      count,
      ip: forwarded || undefined,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('admin audit log error', err);
    return NextResponse.json(
      { error: 'Failed to log action' },
      { status: 500 },
    );
  }
}
