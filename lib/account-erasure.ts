import { adminAuth, adminDb } from '@/lib/firebase-admin';
import {
  collectRegistrationFilePaths,
  collectUserStorageFilePaths,
  deleteStorageFiles,
} from '@/lib/server-registration-files';
import { collectSubmissions } from '@/lib/account-erasure-submissions';

/**
 * Erases a member's account: registrations (and attached PDFs, releasing any
 * seats they held), attendance entries, showcase votes, team and board
 * applications (with their resumes, CVs and cover files), showcase projects
 * (with covers and votes on them), course-planner data, AI chats, shared CV,
 * profile document (including newsletter subscription and transcript data), and
 * Firebase Auth account. Required by GDPR Art. 17.
 *
 * Used by self-service deletion and by admins in the Members tab, so both
 * remove exactly the same data. Every step is idempotent, so a failed run can be
 * retried; it throws if a stored file cannot be deleted, leaving the account intact.
 */
export async function eraseAccount(uid: string): Promise<void> {
  // The consent record first: partners list and download only CVs that have
  // one, so a run that fails later never leaves the member shown to them.
  await adminDb.collection('cvs').doc(uid).delete();

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
  // so list the caller's prefix as well. If files cannot be listed or deleted
  // the request fails and the account stays intact, so the user can retry.
  const storedPaths = await collectUserStorageFilePaths(uid);
  storedPaths.forEach((p) => filePaths.add(p));
  filePaths.add(`cvs/${uid}/cv.pdf`);
  // Applications and showcase projects: files go with the rest, docs further down.
  const submissions = await collectSubmissions(uid);
  submissions.filePaths.forEach((p) => filePaths.add(p));
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

  // In a transaction per event, so an admin marking someone else's attendance
  // meanwhile isn't overwritten.
  const attendanceSnap = await adminDb.collection('eventAttendance').get();
  for (const docSnap of attendanceSnap.docs) {
    await adminDb.runTransaction(async (transaction) => {
      const current = await transaction.get(docSnap.ref);
      const entries = current.exists ? current.get('entries') : undefined;
      if (!Array.isArray(entries)) return;
      const filtered = entries.filter(
        (e: { userId?: string }) => e?.userId !== uid,
      );
      if (filtered.length !== entries.length)
        transaction.update(docSnap.ref, { entries: filtered });
    });
  }

  const votesSnap = await adminDb
    .collection('showcaseVotes')
    .where('userId', '==', uid)
    .get();
  // Like an unvote: the project's counter drops with the vote, floored at 0.
  for (const docSnap of votesSnap.docs) {
    await adminDb.runTransaction(async (transaction) => {
      const vote = await transaction.get(docSnap.ref);
      if (!vote.exists) return;
      const projectId = vote.get('projectId');
      const projectRef =
        typeof projectId === 'string' && projectId
          ? adminDb.collection('showcaseProjects').doc(projectId)
          : null;
      const project = projectRef ? await transaction.get(projectRef) : null;

      transaction.delete(docSnap.ref);

      if (projectRef && project?.exists) {
        const total = project.get('votes');
        const next = Math.max(0, (typeof total === 'number' ? total : 0) - 1);
        transaction.update(projectRef, { votes: next });
      }
    });
  }

  const categoriesSnap = await adminDb
    .collection('course_categories')
    .doc(uid)
    .collection('categories')
    .get();
  // Course mappings of the member's categories, plus any left behind by a
  // category deleted before its mappings (those ids start with the uid).
  // listDocuments, since mapping parents only exist through their subcollection.
  const mappingIds = new Set(categoriesSnap.docs.map((d) => d.id));
  const mappingRefs = await adminDb
    .collection('category_courses')
    .listDocuments();
  for (const ref of mappingRefs)
    if (ref.id.startsWith(`${uid}_`)) mappingIds.add(ref.id);
  for (const id of mappingIds) {
    await adminDb.recursiveDelete(
      adminDb.collection('category_courses').doc(id),
    );
  }

  // Firestore batches hold at most 500 writes.
  for (let i = 0; i < submissions.refs.length; i += 500) {
    const batch = adminDb.batch();
    submissions.refs.slice(i, i + 500).forEach((ref) => batch.delete(ref));
    await batch.commit();
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

  // Again at the end: a CV upload that was mid-flight when the files were first
  // deleted may have saved its PDF since (its record write then sees no profile).
  await deleteStorageFiles([`cvs/${uid}/cv.pdf`], { failOnError: true });

  try {
    await adminAuth.deleteUser(uid);
  } catch (err) {
    if ((err as { code?: unknown })?.code !== 'auth/user-not-found') throw err;
  }
}
