// tools/partnerAccess.ts
// Manages the partner allowlist (partnerAccounts/{email}). A listed address may
// sign in with Google (a verified email is required) and review shared CVs at
// /partners/cvs. No prior sign-in is needed, and changes apply immediately.
import 'dotenv/config';
import admin from 'firebase-admin';
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

// Same rule as lib/partner-email.ts; tools run without the app's path aliases.
const partnerEmailKey = (email: string) => email.trim().toLowerCase();

async function addPartner(email: string, company?: string) {
  const key = partnerEmailKey(email);
  await admin
    .firestore()
    .collection('partnerAccounts')
    .doc(key)
    .set({
      email: key,
      ...(company ? { company } : {}),
      addedAt: new Date().toISOString(),
    });
  console.log(
    `Added ${key} to the partner allowlist${company ? ` (${company})` : ''}.`,
  );
  console.log(
    'They can sign in with Google using this address and open /partners/cvs.',
  );
}

async function removePartner(email: string) {
  const key = partnerEmailKey(email);
  await admin.firestore().collection('partnerAccounts').doc(key).delete();
  console.log(
    `Removed ${key} from the partner allowlist. Access ends on their next page load.`,
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
