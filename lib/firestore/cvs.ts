import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase-client';

/**
 * cvs/{uid}: written only by /api/account/cv (rules deny client writes), so the
 * consent record cannot be forged from the browser.
 */
export type MemberCv = {
  id: string;
  path: string;
  fileName: string;
  size: number;
  uploadedAt: string;
  consentAt: string;
  consentVersion: string;
  /** The member's partner-contact choice before sharing; restored on removal. */
  priorPartnerContactOptIn?: boolean;
};

export const getMyCv = async (uid: string): Promise<MemberCv | null> => {
  const snap = await getDoc(doc(db, 'cvs', uid));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Omit<MemberCv, 'id'>) };
};

export const listCvs = async (): Promise<MemberCv[]> => {
  const snapshot = await getDocs(collection(db, 'cvs'));
  return snapshot.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<MemberCv, 'id'>),
  }));
};
