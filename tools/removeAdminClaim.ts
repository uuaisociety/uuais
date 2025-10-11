// tools/removeAdminClaim.ts
import 'dotenv/config';
import admin from 'firebase-admin';

// Either load credentials from GOOGLE_APPLICATION_CREDENTIALS or a json key path
// admin.initializeApp(); // if using default credentials
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
});

async function removeAdmin(email: string) {
  const user = await admin.auth().getUserByEmail(email);
  const existing = user.customClaims || {};
  await admin.auth().setCustomUserClaims(user.uid, { ...existing, admin: false });
  console.log(`Set admin=${false} for ${email}`);
}

(async () => {
  const email = process.argv[2];
  if (!email) {
    console.error('Usage: ts-node tools/removeAdminClaim.ts <email>');
    process.exit(1);
  }
  await removeAdmin(email);
  process.exit(0);
})();