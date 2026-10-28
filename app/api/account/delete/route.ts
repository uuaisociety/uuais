import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requireAuth, authFailureResponse } from '@/lib/server-auth';
import { checkWindow } from '@/lib/rate-limit-in-memory';
import { eraseAccount } from '@/lib/account-erasure';

export const runtime = 'nodejs';

const DELETE_LIMIT = 3;
const DELETE_WINDOW_MS = 60 * 60 * 1000;

/**
 * POST /api/account/delete
 *
 * Self-service erasure of the caller's account; see lib/account-erasure for
 * everything it removes. Every step is idempotent, so a failed request can be retried.
 */
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return authFailureResponse(auth.reason);
  const { uid } = auth.session;

  if (
    !checkWindow(`account-delete:${uid}`, DELETE_LIMIT, DELETE_WINDOW_MS)
      .allowed
  ) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  try {
    await eraseAccount(uid);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('account deletion error', err);
    return NextResponse.json(
      { error: 'Account deletion failed. Please contact us.' },
      { status: 500 },
    );
  }
}
