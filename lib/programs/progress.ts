/**
 * Per-student progress, server-only: the Firestore rules deny every client read of
 * users/{uid}/transcript_data, so only this reduction of it is handed to the browser.
 */

import { adminDb } from '@/lib/firebase-admin';
import type { Program, ProgramCourse } from '@/lib/programs';
import {
  deriveStatuses,
  matchTranscript,
  summarise,
  type ProgramProgress,
  type StoredRegistration,
  type TranscriptEntry,
} from '@/lib/programs/status';

export type { CourseStatus, ProgramProgress } from '@/lib/programs/status';

type StoredTranscript = {
  entries: TranscriptEntry[];
  registrations: StoredRegistration[];
  programCode: string | null;
};

/** Reads the stored certificate data for a user. */
async function loadTranscript(uid: string): Promise<StoredTranscript> {
  const empty = { entries: [], registrations: [], programCode: null };
  try {
    const doc = await adminDb.collection('users').doc(uid).collection('transcript_data').doc('latest').get();
    if (!doc.exists) return empty;
    const data = doc.data();
    return {
      entries: Array.isArray(data?.entries) ? (data.entries as TranscriptEntry[]) : [],
      registrations: Array.isArray(data?.registrations)
        ? (data.registrations as StoredRegistration[])
        : [],
      programCode: (data?.programCode as string) ?? null,
    };
  } catch (error) {
    console.error('[Programs] Failed to load transcript:', error);
    return empty;
  }
}

/**
 * Computes a user's progress through the visible slice of a programme; null when the user has
 * no transcript, so the UI can prompt for one.
 */
export async function getProgramProgress(
  uid: string,
  program: Program,
  courses: ProgramCourse[]
): Promise<ProgramProgress | null> {
  const { entries, registrations } = await loadTranscript(uid);
  if (entries.length === 0 && registrations.length === 0) return null;

  const { passed, registered } = matchTranscript(courses, entries, registrations);
  return summarise(courses, deriveStatuses(courses, program.edges, passed, registered));
}
