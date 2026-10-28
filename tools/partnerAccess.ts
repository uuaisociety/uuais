// tools/partnerAccess.ts
// Manages the partner allowlist (partnerAccounts/{email}). Adding a partner also
// creates (or vets) their Auth account and binds the entry to it, so nobody can
// pre-register the address; see lib/partner-provisioning. The partner then signs
// in on /partners/cvs with an emailed link. Changes apply on their next page load.
import 'dotenv/config';
import admin from 'firebase-admin';
import {
  deprovisionPartner,
  provisionPartner,
} from '../lib/partner-provisioning';
import fs from 'fs';

// Explicitly control emulator usage for Admin SDK to avoid ECONNREFUSED when emulator isn't running
// Set USE_FIREBASE_EMULATORS="true" to use local emulators. Otherwise, ensure emulator env is cleared.
const useEmulators = process.env.USE_FIREBASE_EMULATORS === 'true';
if (!useEmulators) {
  // Prevent Admin SDK from targeting the local Firestore emulator by accident
  if (process.env.FIRESTORE_EMULATOR_HOST) {
    delete process.env.FIRESTORE_EMULATOR_HOST;
  }
}

// Initialize Admin SDK using explicit service account when provided, otherwise application default.
// This makes it explicit which project/service account is being used and avoids ambiguous failures.
let credential: admin.credential.Credential;
const saPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (saPath) {
  try {
    const raw = fs.readFileSync(saPath, 'utf8');
    const svc = JSON.parse(raw);
    credential = admin.credential.cert(svc as admin.ServiceAccount);
    console.log(
      `Using service account file: ${saPath} (project: ${svc.project_id || 'unknown'})`,
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`Failed to read/parse service account at ${saPath}: ${msg}`);
    console.log(
      'Falling back to application default credentials. Ensure your environment is set up correctly.',
    );
    credential = admin.credential.applicationDefault();
  }
} else {
  credential = admin.credential.applicationDefault();
  console.log(
    'No GOOGLE_APPLICATION_CREDENTIALS set; using application default credentials.',
  );
}

admin.initializeApp({ credential });

async function addPartner(email: string, company?: string) {
  const result = await provisionPartner(
    admin.auth(),
    admin.firestore(),
    email,
    company,
  );
  if (result.replaced)
    console.warn(
      `Deleted an unverified or password account that was already registered to ${result.key}; it may have been created by someone else.`,
    );
  console.log(
    `Added ${result.key} to the partner allowlist${company ? ` (${company})` : ''}, bound to account ${result.uid}.`,
  );
  console.log(
    'They can now open /partners/cvs and sign in with the emailed link sent to this address.',
  );
}

async function removePartner(email: string) {
  const { key, removed } = await deprovisionPartner(
    admin.auth(),
    admin.firestore(),
    email,
  );
  console.log(
    removed
      ? `Removed ${key} from the partner allowlist and signed the account out. Access ends on their next page load.`
      : `${key} was not on the partner allowlist.`,
  );
}

(async () => {
  const [command, email, company] = process.argv.slice(2);
  if (!['add', 'remove'].includes(command) || !email || !email.includes('@')) {
    console.error(
      'Usage: ts-node tools/partnerAccess.ts add <email> [company]',
    );
    console.error('       ts-node tools/partnerAccess.ts remove <email>');
    process.exit(1);
  }
  try {
    if (command === 'add') await addPartner(email, company);
    else await removePartner(email);
    process.exit(0);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Failed to update the partner allowlist:', msg);
    process.exit(2);
  }
})();
