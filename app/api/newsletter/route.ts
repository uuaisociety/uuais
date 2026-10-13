import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { authorizeMember } from '@/lib/member-auth';

export async function POST(req: NextRequest) {
  const auth = await authorizeMember(req);
  if (!auth.ok)
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  if (
    req.headers.get('origin') &&
    req.headers.get('origin') !== new URL(req.url).origin
  ) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  if (
    !req.headers
      .get('content-type')
      ?.toLowerCase()
      .startsWith('application/json')
  ) {
    return NextResponse.json(
      { error: 'invalid content type' },
      { status: 400 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 });
  }
  if (
    !body ||
    typeof body !== 'object' ||
    typeof (body as { newsletter?: unknown }).newsletter !== 'boolean'
  ) {
    return NextResponse.json(
      { error: 'newsletter must be a boolean' },
      { status: 400 },
    );
  }

  const newsletter = (body as { newsletter: boolean }).newsletter;
  try {
    const userRef = adminDb.collection('users').doc(auth.uid);
    const member = await adminDb.runTransaction(async (tx) => {
      const user = await tx.get(userRef);
      const profile = user.data();
      if (
        !user.exists ||
        profile?.isMember !== true ||
        typeof profile.privacyAcceptedAt !== 'string' ||
        !profile.privacyAcceptedAt.trim()
      ) {
        return false;
      }
      tx.update(userRef, {
        newsletter,
        updatedAt: new Date().toISOString(),
      });
      return true;
    });
    if (!member)
      return NextResponse.json(
        { error: 'membership required' },
        { status: 403 },
      );
    return NextResponse.json({ ok: true, newsletter });
  } catch (err) {
    console.error('newsletter update failed', err);
    return NextResponse.json(
      { error: 'failed to update newsletter subscription' },
      { status: 500 },
    );
  }
}
