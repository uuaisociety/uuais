import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { checkWindow } from '@/lib/rate-limit-in-memory';
import { readBoundedRequestBody } from '@/lib/bounded-request-body';
import { partnerEmailKey } from '@/lib/partner-email';

// Low enough that probing which addresses are partners is slow, high enough for
// a partner fixing a typo a few times.
const CHECK_LIMIT = 10;
const CHECK_WINDOW_MS = 10 * 60 * 1000;
const MAX_BODY_BYTES = 1024;
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,253}$/;

/**
 * POST /api/partners/check-email — { email } → { approved }.
 * Lets the partner sign-in refuse an unknown address before emailing a link.
 * Only the partner allowlist is consulted: admins never need the email link, and
 * answering for them would reveal who the admins are. Only UX: /partners/cvs and
 * /api/cvs re-check access (bound to the partner's account) after sign-in.
 */
export async function POST(req: NextRequest) {
  try {
    // On Vercel the platform sets x-vercel-forwarded-for itself, so a client cannot
    // forge it; anywhere else that header is client-controlled, so ignore it there.
    const ip =
      (process.env.VERCEL
        ? req.headers.get('x-vercel-forwarded-for')?.trim()
        : undefined) ||
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      'unknown';
    // Own bucket: rotating IPs can fill this store, but then only this endpoint
    // fails closed, not CV downloads, uploads or account deletion.
    const rate = checkWindow(
      ip,
      CHECK_LIMIT,
      CHECK_WINDOW_MS,
      'partner-email-check',
    );
    if (!rate.allowed) {
      return NextResponse.json(
        { error: 'Too many attempts. Please try again in a few minutes.' },
        { status: 429 },
      );
    }

    const raw = await readBoundedRequestBody(req, MAX_BODY_BYTES);
    if (!raw)
      return NextResponse.json({ error: 'Request too large' }, { status: 413 });
    let email = '';
    try {
      const parsed = JSON.parse(new TextDecoder().decode(raw)) as {
        email?: unknown;
      };
      email = typeof parsed.email === 'string' ? parsed.email : '';
    } catch {
      // fall through to the validation error
    }
    const key = partnerEmailKey(email);
    if (!EMAIL_RE.test(key)) {
      return NextResponse.json(
        { error: 'Enter a valid email address.' },
        { status: 400 },
      );
    }

    const entry = await adminDb.collection('partnerAccounts').doc(key).get();
    return NextResponse.json({ approved: entry.exists });
  } catch (err) {
    console.error('partner email check error', err);
    return NextResponse.json({ error: 'internal error' }, { status: 500 });
  }
}
