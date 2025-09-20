// tools/setAdminClaim.ts
import 'dotenv/config';
import admin from 'firebase-admin';

// Either load credentials from GOOGLE_APPLICATION_CREDENTIALS or a json key path
// admin.initializeApp(); // if using default credentials
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
});

async function setAdmin(email: string, isAdmin: boolean) {
  const user = await admin.auth().getUserByEmail(email);
  const existing = user.customClaims || {};
  await admin.auth().setCustomUserClaims(user.uid, { ...existing, admin: isAdmin });
  console.log(`Set admin=${isAdmin} for ${email}`);
}

(async () => {
  const email = process.argv[2];
  const flag = process.argv[3];
  if (!email || !flag) {
    console.error('Usage: ts-node tools/setAdminClaim.ts <email> <true|false>');
    process.exit(1);
  }
  await setAdmin(email, flag === 'true');
  process.exit(0);
})();