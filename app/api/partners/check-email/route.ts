import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { checkWindow } from '@/lib/rate-limit-in-memory';
import { readBoundedRequestBody } from '@/lib/bounded-request-body';
import { partnerEmailKey } from '@/lib/partner-email';

// Low enough that probing which addresses are partners or admins is slow,
// high enough for a partner fixing a typo a few times.
const CHECK_LIMIT = 10;
const CHECK_WINDOW_MS = 10 * 60 * 1000;
const MAX_BODY_BYTES = 1024;
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,253}$/;

const isAdminEmail = async (email: string): Promise<boolean> => {
  try {
    const { customClaims } = await adminAuth.getUserByEmail(email);
    return customClaims?.admin === true || customClaims?.superAdmin === true;
  } catch {
    return false; // no account with this email
  }
};

/**
 * POST /api/partners/check-email — { email } → { approved }.
 * Lets the partner sign-in refuse an unknown address before emailing a link.
 * Only UX: /partners/cvs and /api/cvs re-check access after sign-in anyway.
 */
export async function POST(req: NextRequest) {
  try {
    // The platform sets x-vercel-forwarded-for itself, so a client cannot forge it; the
    // spoofable x-forwarded-for is only a fallback for other hosts.
    const ip =
      req.headers.get('x-vercel-forwarded-for')?.trim() ||
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      'unknown';
    const rate = checkWindow(
      `partner-email-check:${ip}`,
      CHECK_LIMIT,
      CHECK_WINDOW_MS,
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

    const [entry, admin] = await Promise.all([
      adminDb.collection('partnerAccounts').doc(key).get(),
      isAdminEmail(key),
    ]);
    return NextResponse.json({ approved: entry.exists || admin });
  } catch (err) {
    console.error('partner email check error', err);
    return NextResponse.json({ error: 'internal error' }, { status: 500 });
  }
}
