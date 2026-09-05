/**
 * Error reports on the generated programme maps. Reports are written server-side only — the
 * client posts to /api/programs/feedback — so nobody can seed the collection directly.
 */

import { collection, doc, getDocs, onSnapshot, orderBy, query, updateDoc, where } from 'firebase/firestore';
import { db } from '@/lib/firebase-client';

export const PROGRAM_FEEDBACK_COLLECTION = 'programFeedback';

export type ProgramFeedbackKind = 'wrong-prerequisite' | 'missing-course' | 'wrong-rule' | 'other';

export type ProgramFeedbackStatus = 'open' | 'resolved';

export interface ProgramFeedback {
  id: string;
  /** Slug of the programme the reader was looking at, e.g. "ttf2y". */
  programSlug: string;
  programName: string;
  /** The specialisation in view, when one was selected. */
  trackId: string | null;
  /** The course the report is about, when the reader named one. */
  courseCode: string | null;
  kind: ProgramFeedbackKind;
  message: string;
  /** Optional, so a reader can be told what came of it. */
  contact: string | null;
  status: ProgramFeedbackStatus;
  createdAt: string;
}

export async function listProgramFeedback(): Promise<ProgramFeedback[]> {
  const snapshot = await getDocs(
    query(collection(db, PROGRAM_FEEDBACK_COLLECTION), orderBy('createdAt', 'desc'))
  );
  return snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() }) as ProgramFeedback);
}

export async function setProgramFeedbackStatus(
  id: string,
  status: ProgramFeedbackStatus
): Promise<void> {
  await updateDoc(doc(db, PROGRAM_FEEDBACK_COLLECTION, id), { status });
}

/**
 * Open reports, live, for the dashboard's attention strip. Filtered server-side and left
 * unordered so a single-field index carries it — a report nobody has read is the only
 * kind worth counting.
 */
export function subscribeOpenProgramFeedback(
  callback: (reports: ProgramFeedback[]) => void
): () => void {
  return onSnapshot(
    query(collection(db, PROGRAM_FEEDBACK_COLLECTION), where('status', '==', 'open')),
    (snapshot) => {
      callback(snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() }) as ProgramFeedback));
    },
    (error) => {
      console.error('Firestore subscription failed:', error);
      callback([]);
    }
  );
}
