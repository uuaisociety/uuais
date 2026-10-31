import '@/lib/firebase-admin';
import admin from 'firebase-admin';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { isSafeStoragePath } from '@/lib/admin-file-download';

type DocRef = FirebaseFirestore.DocumentReference;

/** What a member submitted outside their profile, found for account erasure. */
export type Submissions = { filePaths: string[]; refs: DocRef[] };

// The apply and board-apply routes key their lock/limit docs this way.
const keyPart = (s: string) => encodeURIComponent(s);

// Only files under the submission's own prefix, so a crafted path in a stored
// document can never make erasure delete someone else's file.
const fileIn = (value: unknown, prefix: string): string | null => {
  const path = (value as { path?: unknown } | null | undefined)?.path;
  return typeof path === 'string' && isSafeStoragePath(path, prefix)
    ? path
    : null;
};

// Board applications only carry an email, and team applications may have been
// sent signed out, so they are matched by email too, but only a verified one:
// otherwise an account could erase another person's application by claiming
// their address.
async function verifiedEmail(uid: string): Promise<string | null> {
  try {
    const user = await adminAuth.getUser(uid);
    return user.emailVerified && user.email
      ? user.email.trim().toLowerCase()
      : null;
  } catch (err) {
    if ((err as { code?: unknown })?.code === 'auth/user-not-found')
      return null;
    throw err;
  }
}

const where = (collection: string, field: string, value: string) =>
  adminDb.collection(collection).where(field, '==', value).get();

/**
 * Team applications (+ resume, campaign lock, limit counters), board
 * applications (+ CV and cover file, role locks, limit counter) and showcase
 * projects (+ cover images, other members' votes on them) belonging to `uid`,
 * plus their AI and showcase usage counters, queued emails and any partner
 * allowlist entry.
 */
export async function collectSubmissions(uid: string): Promise<Submissions> {
  const email = await verifiedEmail(uid);
  const files = new Set<string>();
  const refs = new Map<string, DocRef>();
  const add = (ref: DocRef) => refs.set(ref.path, ref);

  const teamSnaps = await Promise.all([
    where('teamApplications', 'uid', uid),
    ...(email ? [where('teamApplications', 'emailNormalized', email)] : []),
  ]);
  for (const snap of teamSnaps) {
    for (const app of snap.docs) {
      const data = app.data() as {
        uid?: unknown;
        emailNormalized?: unknown;
        campaignId?: unknown;
        resume?: unknown;
      };
      const resume = fileIn(data.resume, 'team-applications/');
      if (resume) files.add(resume);
      const identity =
        typeof data.uid === 'string' && data.uid
          ? data.uid
          : typeof data.emailNormalized === 'string'
            ? data.emailNormalized
            : '';
      if (identity && typeof data.campaignId === 'string' && data.campaignId)
        add(
          adminDb
            .collection('applicationCampaignLocks')
            .doc(`${keyPart(identity)}__${keyPart(data.campaignId)}`),
        );
      add(app.ref);
    }
  }
  add(adminDb.collection('applicationUserLimits').doc(keyPart(uid)));

  if (email) {
    add(adminDb.collection('applicationUserLimits').doc(keyPart(email)));
    const boards = await where('boardApplications', 'emailNormalized', email);
    for (const app of boards.docs) {
      const data = app.data() as { cv?: unknown; coverFile?: unknown };
      for (const f of [data.cv, data.coverFile]) {
        const path = fileIn(f, 'board-applications/');
        if (path) files.add(path);
      }
      const locks = await where(
        'boardApplicationUserRoleLocks',
        'applicationId',
        app.id,
      );
      locks.docs.forEach((lock) => add(lock.ref));
      add(app.ref);
    }
    add(adminDb.collection('boardApplicationUserLimits').doc(keyPart(email)));
  }

  const projects = await where('showcaseProjects', 'creatorUserId', uid);
  for (const project of projects.docs) {
    const cover = fileIn(
      { path: project.get('coverImagePath') },
      `showcase/${uid}/`,
    );
    if (cover) files.add(cover);
    const votes = await where('showcaseVotes', 'projectId', project.id);
    votes.docs.forEach((vote) => add(vote.ref));
    add(project.ref);
  }
  // Covers are namespaced per uploader, including uploads no project references.
  const [stored] = await admin
    .storage()
    .bucket()
    .getFiles({ prefix: `showcase/${uid}/` });
  stored.forEach((f) => files.add(f.name));

  // Per-user usage counters, queued emails to the member, and a partner
  // allowlist entry bound to this account.
  const usage = await Promise.all([
    where('ai_usage', 'userId', uid),
    where('showcase_usage', 'uid', uid),
    where('partnerAccounts', 'uid', uid),
    ...(email ? [where('mail', 'to', email)] : []),
  ]);
  usage.forEach((snap) => snap.docs.forEach((d) => add(d.ref)));
  if (email) {
    // Not a message also addressed to others: deleting it would cancel or
    // erase their copy.
    const shared = await adminDb
      .collection('mail')
      .where('to', 'array-contains', email)
      .get();
    shared.docs
      .filter((d) => (d.get('to') as unknown[]).length === 1)
      .forEach((d) => add(d.ref));
  }

  return { filePaths: [...files], refs: [...refs.values()] };
}
