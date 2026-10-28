import { adminDb } from '@/lib/firebase-admin';
import { partnerEmailKey } from '@/lib/partner-email';
import type { ServerSession } from '@/lib/server-auth';

/**
 * Shared CVs may be reviewed by admins and by partner-company accounts: the
 * account an allowlist entry is bound to, signed in with its verified email. Checked
 * per request, so adding or removing a partner applies on their next page load.
 */
export async function canReviewCvs(
  session: ServerSession | null,
): Promise<boolean> {
  if (!session) return false;
  if (session.isAdmin) return true;
  if (!session.email || !session.emailVerified) return false;
  const entry = await adminDb
    .collection('partnerAccounts')
    .doc(partnerEmailKey(session.email))
    .get();
  // Bound to the account add:partner created or vetted: another account that
  // merely carries the same (verified) email, e.g. one pre-registered with a
  // password, is refused. See lib/partner-provisioning.
  return entry.exists && entry.get('uid') === session.uid;
}
