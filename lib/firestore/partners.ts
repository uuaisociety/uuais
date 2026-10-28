import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase-client';
import { partnerEmailKey } from '@/lib/partner-email';

/**
 * Whether this email is on the partner allowlist (partnerAccounts/{email}).
 * Rules only let a signed-in user read the entry for their own verified email.
 */
export const isPartnerEmail = async (email: string): Promise<boolean> =>
  (await getDoc(doc(db, 'partnerAccounts', partnerEmailKey(email)))).exists();
