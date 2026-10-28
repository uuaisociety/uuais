// Used by tools/partnerAccess.ts (run with ts-node, no path aliases), so imports stay relative.
import type {
  auth as adminAuth,
  firestore as adminFirestore,
} from 'firebase-admin';
import { partnerEmailKey } from './partner-email';

type Auth = adminAuth.Auth;
type UserRecord = adminAuth.UserRecord;
type Db = adminFirestore.Firestore;

/**
 * Why partner access is bound to one Auth account: email-link sign-in needs the
 * Email/Password provider enabled, which also lets anyone `signUp` an address
 * with a password. If an attacker pre-registers a partner's address, the
 * partner's first email-link sign-in verifies *that* account and the attacker's
 * password keeps working. So the allowlist entry stores the uid we created (or
 * vetted), and access requires that exact uid.
 */

const isNotFound = (err: unknown) =>
  (err as { code?: unknown })?.code === 'auth/user-not-found';

// passwordHash is only returned by listUsers, not getUser, so page through.
async function hasPassword(auth: Auth, uid: string): Promise<boolean> {
  let pageToken: string | undefined;
  do {
    const page = await auth.listUsers(1000, pageToken);
    const user = page.users.find((u) => u.uid === uid);
    if (user) return Boolean(user.passwordHash);
    pageToken = page.pageToken;
  } while (pageToken);
  return false;
}

const onlyEmailProvider = (user: UserRecord) =>
  user.providerData.every((p) => p.providerId === 'password');

export type ProvisionResult = {
  key: string;
  uid: string;
  /** The tool created the account (and may delete it on removal). */
  ownsAccount: boolean;
  /** An unverified or password account on this address was deleted first. */
  replaced: boolean;
};

export class PartnerProvisioningError extends Error {}

export async function provisionPartner(
  auth: Auth,
  db: Db,
  email: string,
  company?: string,
): Promise<ProvisionResult> {
  const key = partnerEmailKey(email);
  let user: UserRecord | null = await auth
    .getUserByEmail(key)
    .catch((err: unknown) => {
      if (isNotFound(err)) return null;
      throw err;
    });

  let replaced = false;
  if (user) {
    const password = await hasPassword(auth, user.uid);
    if (onlyEmailProvider(user)) {
      // Email-only accounts are never created by the app with a password, so an
      // unverified or password-bearing one may have been planted: replace it.
      if (!user.emailVerified || password) {
        await auth.deleteUser(user.uid);
        user = null;
        replaced = true;
      }
    } else if (password || !user.emailVerified) {
      // A member's Google/GitHub account: never delete it, and don't trust it.
      throw new PartnerProvisioningError(
        `${key} already belongs to a ${user.providerData.map((p) => p.providerId).join('/')} account that ${
          password ? 'has a password' : 'has an unverified email'
        }, so it can't be made a partner account safely. Use a different address, or remove that account first.`,
      );
    }
  }

  const ownsAccount = !user;
  if (!user) user = await auth.createUser({ email: key });

  await db
    .collection('partnerAccounts')
    .doc(key)
    .set({
      email: key,
      uid: user.uid,
      ownsAccount,
      ...(company ? { company } : {}),
      addedAt: new Date().toISOString(),
    });
  return { key, uid: user.uid, ownsAccount, replaced };
}

/** Removes the entry; deletes the account the tool created, or signs a vetted one out everywhere. */
export async function deprovisionPartner(
  auth: Auth,
  db: Db,
  email: string,
): Promise<{ key: string; removed: boolean }> {
  const key = partnerEmailKey(email);
  const ref = db.collection('partnerAccounts').doc(key);
  const snap = await ref.get();
  if (!snap.exists) return { key, removed: false };
  const uid = snap.get('uid');
  await ref.delete();
  if (typeof uid === 'string' && uid) {
    try {
      if (snap.get('ownsAccount') === true) await auth.deleteUser(uid);
      else await auth.revokeRefreshTokens(uid);
    } catch (err) {
      if (!isNotFound(err)) throw err;
    }
  }
  return { key, removed: true };
}
