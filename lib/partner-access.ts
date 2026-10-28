import { adminDb } from '@/lib/firebase-admin';
import { partnerEmailKey } from '@/lib/partner-email';
import type { ServerSession } from '@/lib/server-auth';

/**
 * Shared CVs may be reviewed by admins and by partner-company accounts: any
 * user whose verified sign-in email is on the partnerAccounts allowlist. Checked
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
  return entry.exists;
}
