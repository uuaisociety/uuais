import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { requireAdmin, authFailureResponse } from '@/lib/server-auth';
import { readBoundedRequest } from '@/lib/bounded-request-body';
import { checkWindow } from '@/lib/rate-limit-in-memory';
import { logAdminAction, type AdminAuditEntry } from '@/lib/server-audit-log';
import { adminDb } from '@/lib/firebase-admin';
import { renderTemplatedEmail } from '@/lib/email';

export const runtime = 'nodejs';

const MAX_BODY_BYTES = 1024;
// Bulk invites send one email per registrant.
const MAIL_LIMIT = 500;
const MAIL_WINDOW_MS = 60 * 60 * 1000;
const ID_RE = /^[A-Za-z0-9_-]{1,128}$/;

type Email = {
  to: string;
  subject: string;
  templatePath: string;
  variables: Record<string, string>;
};

async function emailsAllowed(uid: unknown): Promise<boolean> {
  if (typeof uid !== 'string' || !uid) return true;
  const profile = await adminDb.collection('users').doc(uid).get();
  return profile.get('unsubscribedFromEmails') !== true;
}

// An invitation to confirm a spot: only once the registration is invited, and
// with the confirmation token already stored on it.
async function eventInvite(id: string, origin: string): Promise<Email | null> {
  const reg = await adminDb.collection('registrations').doc(id).get();
  if (!reg.exists) return null;
  const to = reg.get('userEmail');
  const token = reg.get('confirmationToken');
  if (reg.get('status') !== 'invited' || typeof token !== 'string' || !token)
    return null;
  if (typeof to !== 'string' || !to) return null;
  if (!(await emailsAllowed(reg.get('userId')))) return null;

  let subject = 'You are invited to confirm your spot';
  const eventId = reg.get('eventId');
  if (typeof eventId === 'string' && eventId) {
    const event = await adminDb.collection('events').doc(eventId).get();
    const title = event.get('title');
    if (typeof title === 'string' && title) subject = `Invitation to ${title}`;
  }
  const name = reg.get('userName');
  return {
    to,
    subject,
    templatePath: '/email-templates/eventRegistration.html',
    variables: {
      name: typeof name === 'string' ? name : '',
      confirm_link: `${origin}/confirm/${token}`,
    },
  };
}

// Tells the builder their project went live: only for a published project.
async function showcaseApproved(
  id: string,
  origin: string,
): Promise<Email | null> {
  const project = await adminDb.collection('showcaseProjects').doc(id).get();
  if (!project.exists || project.get('published') !== true) return null;
  const creatorUserId = project.get('creatorUserId');
  if (typeof creatorUserId !== 'string' || !creatorUserId) return null;
  const profile = await adminDb.collection('users').doc(creatorUserId).get();
  const to = profile.get('email');
  if (typeof to !== 'string' || !to) return null;
  if (profile.get('unsubscribedFromEmails') === true) return null;

  const title = String(project.get('title') ?? '');
  const slug = project.get('slug');
  return {
    to,
    subject: `${title} is live on the showcase`,
    templatePath: '/email-templates/showcaseApproved.html',
    variables: {
      name:
        profile.get('displayName') ||
        profile.get('name') ||
        project.get('creatorName') ||
        'there',
      project_title: title,
      project_url: `${origin}/showcase/${typeof slug === 'string' && slug ? slug : id}`,
    },
  };
}

/**
 * POST /api/admin/mail  { kind: 'event-invite' | 'showcase-approved', id }
 *
 * Queues one templated email about a record for the Trigger Email extension.
 * Recipient and content come from the stored record, never the request, and
 * each email is audit-logged. Clients can't write the `mail` collection.
 */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return authFailureResponse(auth.reason);
  if (
    !checkWindow(`admin-mail:${auth.session.uid}`, MAIL_LIMIT, MAIL_WINDOW_MS)
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
  const { kind, id } = (body && typeof body === 'object' ? body : {}) as {
    kind?: unknown;
    id?: unknown;
  };
  if (typeof id !== 'string' || !ID_RE.test(id))
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  try {
    // Templates are served by this app; links point at the public site.
    const origin = req.nextUrl.origin;
    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || origin).replace(
      /\/$/,
      '',
    );
    let email: Email | null;
    if (kind === 'event-invite') {
      email = await eventInvite(id, siteUrl);
    } else if (kind === 'showcase-approved') {
      email = await showcaseApproved(id, siteUrl);
    } else {
      return NextResponse.json({ error: 'Invalid kind' }, { status: 400 });
    }
    // Nothing to send (no address, unsubscribed, or not in the right state).
    if (!email) return NextResponse.json({ success: true, sent: false });

    const html = await renderTemplatedEmail({
      origin,
      templatePath: email.templatePath,
      variables: email.variables,
    });
    const mailRef = adminDb.collection('mail').doc();
    const forwarded = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
    const entry: AdminAuditEntry = {
      action: 'email',
      adminUid: auth.session.uid,
      path: `mail/${mailRef.id}`,
      template: kind,
      ...(kind === 'event-invite' ? { regId: id } : {}),
      ip: forwarded || undefined,
    };
    await logAdminAction(entry, { required: true });
    await mailRef.set({
      to: email.to,
      message: { subject: email.subject, html },
      createdAt: FieldValue.serverTimestamp(),
    });
    return NextResponse.json({ success: true, sent: true });
  } catch (err) {
    console.error('admin mail error', err);
    return NextResponse.json(
      { error: 'Sending the email failed. Please try again.' },
      { status: 500 },
    );
  }
}
