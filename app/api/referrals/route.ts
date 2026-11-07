import { createHash, timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { checkWindow } from '@/lib/rate-limit-in-memory';
import { rankReferrers } from '@/lib/referrals';

export const runtime = 'nodejs';

/**
 * GET /api/referrals
 *
 * How many members each person referred, for the external leaderboard.
 *
 * Auth: bearer token from REFERRALS_API_TOKEN. Only this route accepts it and
 * the route only returns referrer names with counts, never who was referred,
 * so a leaked token exposes nothing else. Fail-closed when unset.
 * See docs/referrals-api.md.
 */

const BURST_LIMIT = 60;
const BURST_WINDOW_MS = 60_000;
const AUTH_FAIL_LIMIT = 10;
const AUTH_FAIL_WINDOW_MS = 15 * 60_000;

function clientKey(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

/** Constant-time comparison: hash both so the buffers always match in length. */
function safeEqual(a: string, b: string): boolean {
  const ha = createHash('sha256').update(a).digest();
  const hb = createHash('sha256').update(b).digest();
  return timingSafeEqual(ha, hb);
}

function isAuthorized(request: NextRequest): boolean {
  const expected = process.env.REFERRALS_API_TOKEN;
  if (!expected) return false;
  const auth = request.headers.get('authorization') ?? '';
  const token = auth.startsWith('Bearer ') ? auth.slice('Bearer '.length) : '';
  if (!token) return false;
  return safeEqual(token, expected);
}

const NO_STORE = { 'Cache-Control': 'no-store' };

export async function GET(request: NextRequest) {
  const ip = clientKey(request);
  if (
    !checkWindow(`referrals:burst:${ip}`, BURST_LIMIT, BURST_WINDOW_MS).allowed
  ) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  if (!isAuthorized(request)) {
    const fail = checkWindow(
      `referrals:authfail:${ip}`,
      AUTH_FAIL_LIMIT,
      AUTH_FAIL_WINDOW_MS,
    );
    if (!fail.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401, headers: { 'WWW-Authenticate': 'Bearer realm="api"' } },
    );
  }

  try {
    // Read only the two fields the count needs, never the rest of the profile.
    const snap = await adminDb
      .collection('users')
      .where('heardOfUs', '==', 'referral')
      .select('heardOfUs', 'referredBy')
      .get();
    const referrers = rankReferrers(snap.docs.map((d) => d.data()));
    return NextResponse.json({ referrers }, { headers: NO_STORE });
  } catch (error) {
    console.error('[referrals] failed to count referrals', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
