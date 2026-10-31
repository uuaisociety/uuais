import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { getServerSession } from '@/lib/server-auth';
import { canReviewCvs } from '@/lib/partner-access';
import { adminDb } from '@/lib/firebase-admin';
import CvReviewPage from '@/components/pages/CvReviewPage';
import type { SharedCv } from '@/lib/export-cvs';
import { logAdminAction } from '@/lib/server-audit-log';
import { checkWindow } from '@/lib/rate-limit-in-memory';

// Views logged per partner; reloads beyond this aren't, so a loop can't flood
// the audit trail. Downloads are always logged.
const VIEW_LOG_LIMIT = 30;
const VIEW_LOG_WINDOW_MS = 60 * 60 * 1000;

export const metadata: Metadata = {
  title: 'CV review',
  robots: { index: false, follow: false },
};

// Display hygiene for member-typed text: invisible format characters (e.g.
// right-to-left overrides that make text read differently) dropped, length
// capped like the Firestore rules, so no profile can bloat or spoof the page.
const clean = (value: unknown, max: number): string =>
  String(value ?? '')
    .replace(/\p{Cf}/gu, '')
    .trim()
    .slice(0, max);

// Members who consented to sharing, with the profile details their consent
// covers (name, email, programme, expected graduation year). Read with the
// Admin SDK so partner accounts never get client access to member profiles.
// Only current members are listed: sharing is a member benefit.
async function loadSharedCvs(): Promise<SharedCv[]> {
  const records = await adminDb.collection('cvs').get();
  if (records.empty) return [];
  const profiles = await adminDb.getAll(
    ...records.docs.map((d) => adminDb.collection('users').doc(d.id)),
  );
  const byUid = new Map(profiles.map((p) => [p.id, p]));
  return records.docs
    .filter((d) => byUid.get(d.id)?.get('isMember') === true)
    .map((d) => {
      const p = byUid.get(d.id);
      const year = Number(p?.get('expectedGraduationYear'));
      return {
        uid: d.id,
        name:
          clean(p?.get('name') || p?.get('displayName'), 100) ||
          'Unnamed member',
        email: clean(p?.get('email'), 254),
        program: clean(p?.get('program'), 150),
        graduationYear: Number.isInteger(year) && year > 0 ? year : null,
        consentAt: String(d.get('consentAt') || ''),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'sv'));
}

export default async function Page() {
  const session = await getServerSession();
  // Partners sign in here, by emailed link only; members never need this page.
  if (!session) return <CvReviewPage access="signin" />;
  if (!(await canReviewCvs(session))) return <CvReviewPage access="denied" />;
  const cvs = await loadSharedCvs();
  // Partners see member details here before any download, so the view is
  // logged too (best-effort: a log failure doesn't block the list).
  if (
    !session.isAdmin &&
    checkWindow(
      `partner-view:${session.uid}`,
      VIEW_LOG_LIMIT,
      VIEW_LOG_WINDOW_MS,
    ).allowed
  ) {
    const forwarded = (await headers())
      .get('x-forwarded-for')
      ?.split(',')[0]
      ?.trim();
    await logAdminAction({
      action: 'view',
      adminUid: session.uid,
      count: cvs.length,
      ip: forwarded || undefined,
      role: 'partner',
      email: session.email,
    });
  }
  return <CvReviewPage access="granted" cvs={cvs} />;
}
