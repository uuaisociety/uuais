import { adminAuth, adminDb } from '@/lib/firebase-admin';
import {
  collectRegistrationFilePaths,
  collectUserStorageFilePaths,
  deleteStorageFiles,
} from '@/lib/server-registration-files';

/**
 * Erases a member's account: registrations (and attached PDFs, releasing any
 * seats they held), attendance entries, showcase votes, course-planner data, AI
 * chats, shared CV, profile document (including newsletter subscription and
 * transcript data), and Firebase Auth account. Required by GDPR Art. 17.
 *
 * Used by self-service deletion and by admins in the Members tab, so both
 * remove exactly the same data. Every step is idempotent, so a failed run can be
 * retried; it throws if a stored file cannot be deleted, leaving the account intact.
 */
export async function eraseAccount(uid: string): Promise<void> {
  const filePaths = new Set<string>();

  const regsSnap = await adminDb
    .collection('registrations')
    .where('userId', '==', uid)
    .get();
  for (const docSnap of regsSnap.docs) {
    collectRegistrationFilePaths(docSnap.data())?.forEach((p) =>
      filePaths.add(p),
    );
  }

  // Storage-first: orphaned uploads are not referenced by any registration,
  // so list the caller's prefix as well. If a file cannot be deleted the
  // request fails and the account stays intact, so the user can retry.
  try {
    const storedPaths = await collectUserStorageFilePaths(uid);
    storedPaths.forEach((p) => filePaths.add(p));
  } catch (err) {
    console.warn('Failed to list stored files for', uid, err);
  }
  filePaths.add(`cvs/${uid}/cv.pdf`);
  await deleteStorageFiles(Array.from(filePaths), { failOnError: true });

  // One transaction per registration so counted seats are released.
  for (const docSnap of regsSnap.docs) {
    await adminDb.runTransaction(async (transaction) => {
      const current = await transaction.get(docSnap.ref);
      if (!current.exists) return;
      const status = String(current.get('status') || 'registered');
      const counted =
        current.get('counted') === true ||
        (current.get('counted') === undefined &&
          (status === 'registered' || status === 'confirmed'));
      const eventId = current.get('eventId');
      const eventRef =
        counted && typeof eventId === 'string' && eventId
          ? adminDb.collection('events').doc(eventId)
          : null;
      const event = eventRef ? await transaction.get(eventRef) : null;

      transaction.delete(docSnap.ref);

      if (eventRef && event?.exists) {
        const total = event.get('currentRegistrations');
        const next = Math.max(0, (typeof total === 'number' ? total : 0) - 1);
        transaction.update(eventRef, { currentRegistrations: next });
      }
    });
  }

  const attendanceSnap = await adminDb.collection('eventAttendance').get();
  for (const docSnap of attendanceSnap.docs) {
    const entries = docSnap.get('entries');
    if (!Array.isArray(entries)) continue;
    const filtered = entries.filter(
      (e: { userId?: string }) => e?.userId !== uid,
    );
    if (filtered.length !== entries.length)
      await docSnap.ref.update({ entries: filtered });
  }

  const votesSnap = await adminDb
    .collection('showcaseVotes')
    .where('userId', '==', uid)
    .get();
  for (const docSnap of votesSnap.docs) await docSnap.ref.delete();

  const categoriesSnap = await adminDb
    .collection('course_categories')
    .doc(uid)
    .collection('categories')
    .get();
  for (const docSnap of categoriesSnap.docs) {
    await adminDb.recursiveDelete(
      adminDb.collection('category_courses').doc(docSnap.id),
    );
  }

  // recursiveDelete also removes subcollections (e.g. users/{uid}/transcript_data).
  for (const collection of [
    'course_categories',
    'favorites',
    'ai_chats',
    'programProgress',
    'cvs',
    'users',
  ]) {
    await adminDb.recursiveDelete(adminDb.collection(collection).doc(uid));
  }

  try {
    await adminAuth.deleteUser(uid);
  } catch (err) {
    if ((err as { code?: unknown })?.code !== 'auth/user-not-found') throw err;
  }
}
