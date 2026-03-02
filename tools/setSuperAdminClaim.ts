// tools/setSuperAdminClaim.ts
import 'dotenv/config';
import admin from 'firebase-admin';
import fs from 'fs';

// Explicitly control emulator usage for Admin SDK to avoid ECONNREFUSED when emulator isn't running
// Set USE_FIREBASE_EMULATORS="true" to use local emulators. Otherwise, ensure emulator env is cleared.
const useEmulators = process.env.USE_FIREBASE_EMULATORS === 'true';
if (!useEmulators) {
  // Prevent Admin SDK from targeting the local Auth emulator by accident
  if (process.env.FIREBASE_AUTH_EMULATOR_HOST) {
    delete process.env.FIREBASE_AUTH_EMULATOR_HOST;
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
    console.log(`Using service account file: ${saPath} (project: ${svc.project_id || 'unknown'})`);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`Failed to read/parse service account at ${saPath}: ${msg}`);
    console.log('Falling back to application default credentials. Ensure your environment is set up correctly.');
    credential = admin.credential.applicationDefault();
  }
} else {
  credential = admin.credential.applicationDefault();
  console.log('No GOOGLE_APPLICATION_CREDENTIALS set; using application default credentials.');
}

admin.initializeApp({ credential });

async function setSuperAdmin(email: string, isSuperAdmin: boolean) {
  console.log(`Looking up user by email: ${email}`);
  let user;
  try {
    user = await admin.auth().getUserByEmail(email);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('There is no user record')) {
      throw new Error(
        `User not found in the project for the credentials in use. Double-check that the email (${email}) exists in Firebase Authentication for the project associated with your credentials and service account.`
      );
    }
    throw err;
  }

  const existing = user.customClaims || {};
  await admin.auth().setCustomUserClaims(user.uid, { ...existing, superAdmin: isSuperAdmin });
  console.log(`Set superAdmin=${isSuperAdmin} for ${email}`);
}

function parseBoolean(input: string): boolean | null {
  const normalized = input.trim().toLowerCase();
  if (["true", "1", "yes", "y"].includes(normalized)) return true;
  if (["false", "0", "no", "n"].includes(normalized)) return false;
  return null;
}

(async () => {
  const email = process.argv[2];
  const flag = process.argv[3];
  if (!email || typeof flag === 'undefined') {
    console.error('Usage: ts-node tools/setSuperAdminClaim.ts <email> <true|false>');
    process.exit(1);
  }
  const parsed = parseBoolean(flag);
  if (parsed === null) {
    console.error('Invalid boolean for <true|false>. Accepted: true/false, 1/0, yes/no');
    process.exit(1);
  }
  try {
    await setSuperAdmin(email, parsed);
    process.exit(0);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Failed to set custom claim:', msg);
    process.exit(2);
  }
})();
