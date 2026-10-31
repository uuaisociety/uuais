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
    return user.emailVerified && user.email ? user.email.trim() : null;
  } catch (err) {
    if ((err as { code?: unknown })?.code === 'auth/user-not-found')
      return null;
    throw err;
  }
}

// Whether `address` is another account's sign-in email, so mail to it is that
// person's, not the member's.
async function belongsToOther(address: string, uid: string): Promise<boolean> {
  try {
    return (await adminAuth.getUserByEmail(address)).uid !== uid;
  } catch (err) {
    if ((err as { code?: unknown })?.code === 'auth/user-not-found')
      return false;
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
  const signInEmail = await verifiedEmail(uid);
  const email = signInEmail?.toLowerCase() ?? null;
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
      // The email is typed into the form, so an application matched by it but
      // sent by another signed-in account is theirs, not the member's.
      if (typeof data.uid === 'string' && data.uid && data.uid !== uid)
        continue;
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
      const data = app.data() as {
        uid?: unknown;
        cv?: unknown;
        coverFile?: unknown;
      };
      if (typeof data.uid === 'string' && data.uid && data.uid !== uid)
        continue;
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

  // Per-user usage counters and a partner allowlist entry bound to this account.
  const usage = await Promise.all([
    where('ai_usage', 'userId', uid),
    where('showcase_usage', 'uid', uid),
    where('partnerAccounts', 'uid', uid),
  ]);
  usage.forEach((snap) => snap.docs.forEach((d) => add(d.ref)));

  // Queued emails to the member. `to` is stored as written, so look for the
  // sign-in email as stored and lowercased, and for the addresses typed into
  // the member's own registrations (invites go there), unless one is another
  // account's sign-in email.
  const addresses = new Set<string>();
  if (signInEmail) [signInEmail, email!].forEach((a) => addresses.add(a));
  const regs = await where('registrations', 'userId', uid);
  for (const reg of regs.docs) {
    const typed = reg.get('userEmail');
    if (typeof typed !== 'string' || !typed.trim()) continue;
    for (const a of [typed.trim(), typed.trim().toLowerCase()])
      if (!addresses.has(a) && !(await belongsToOther(a, uid)))
        addresses.add(a);
  }
  for (const address of addresses) {
    const [single, listed] = await Promise.all([
      where('mail', 'to', address),
      adminDb.collection('mail').where('to', 'array-contains', address).get(),
    ]);
    // Not a message also addressed to others (in to, cc or bcc): deleting it
    // would cancel or erase their copy.
    [...single.docs, ...listed.docs]
      .filter((d) => {
        const to = d.get('to');
        return (
          (typeof to === 'string' || (Array.isArray(to) && to.length === 1)) &&
          !d.get('cc') &&
          !d.get('bcc')
        );
      })
      .forEach((d) => add(d.ref));
  }

  return { filePaths: [...files], refs: [...refs.values()] };
}
