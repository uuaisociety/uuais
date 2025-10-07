// tools/setAdminClaim.ts
import 'dotenv/config';
import admin from 'firebase-admin';

// Explicitly control emulator usage for Admin SDK to avoid ECONNREFUSED when emulator isn't running
// Set USE_FIREBASE_EMULATORS="true" to use local emulators. Otherwise, ensure emulator env is cleared.
const useEmulators = process.env.USE_FIREBASE_EMULATORS === 'true';
if (!useEmulators) {
  // Prevent Admin SDK from targeting the local Auth emulator by accident
  if (process.env.FIREBASE_AUTH_EMULATOR_HOST) {
    delete process.env.FIREBASE_AUTH_EMULATOR_HOST;
  }
}

// Initialize Admin SDK using default credentials
// Make sure GOOGLE_APPLICATION_CREDENTIALS is set to your service account JSON when running locally.
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
});

async function setAdmin(email: string, isAdmin: boolean) {
  const user = await admin.auth().getUserByEmail(email);
  const existing = user.customClaims || {};
  await admin.auth().setCustomUserClaims(user.uid, { ...existing, admin: isAdmin });
  console.log(`Set admin=${isAdmin} for ${email}`);
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
    console.error('Usage: ts-node tools/setAdminClaim.ts <email> <true|false>');
    process.exit(1);
  }
  const parsed = parseBoolean(flag);
  if (parsed === null) {
    console.error('Invalid boolean for <true|false>. Accepted: true/false, 1/0, yes/no');
    process.exit(1);
  }
  try {
    await setAdmin(email, parsed);
    process.exit(0);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Failed to set custom claim:', msg);
    process.exit(2);
  }
})();