/**
 * Courses a signed-in student has ticked off, kept across their devices. One document per
 * user holding one array per programme, so an editing burst costs a single write.
 */

import { deleteField, doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase-client';

export const PROGRAM_PROGRESS_COLLECTION = 'programProgress';

/** Programme code → the course codes marked passed in it. */
export type ProgramPassedMap = Record<string, string[]>;

export async function fetchProgramProgress(uid: string): Promise<ProgramPassedMap | null> {
  const snapshot = await getDoc(doc(db, PROGRAM_PROGRESS_COLLECTION, uid));
  if (!snapshot.exists()) return null;
  const passed = snapshot.data().passed;
  if (!passed || typeof passed !== 'object' || Array.isArray(passed)) return {};
  // A hand-edited or older document should degrade to "nothing marked", never throw.
  const result: ProgramPassedMap = {};
  for (const [code, codes] of Object.entries(passed as Record<string, unknown>)) {
    if (Array.isArray(codes)) result[code] = codes.filter((c): c is string => typeof c === 'string');
  }
  return result;
}

/**
 * Replaces one programme's marks; the write merges, so two tabs on two different degrees
 * cannot overwrite each other.
 */
export async function writeProgramPassed(
  uid: string,
  programCode: string,
  passed: string[]
): Promise<void> {
  await setDoc(
    doc(db, PROGRAM_PROGRESS_COLLECTION, uid),
    {
      // Removed rather than stored as [], so a fresh device does not resurrect a dropped degree.
      passed: { [programCode]: passed.length > 0 ? [...passed].sort() : deleteField() },
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}
