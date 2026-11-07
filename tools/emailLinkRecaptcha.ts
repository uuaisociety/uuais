// tools/emailLinkRecaptcha.ts
// Turns reCAPTCHA protection on or off for the email provider, which covers sending
// email sign-in links (members and partners). Google and GitHub sign-in are not affected.
// Once enforced, Firebase refuses link requests without a valid reCAPTCHA token, so a
// script holding our public API key can't burn the daily email quota or uuais.com's
// sending reputation. The web SDK picks the setting up by itself; no app code change.
//
// Prerequisites (one-off, in the Google Cloud / Firebase console):
//   1. The project is upgraded to Firebase Authentication with Identity Platform.
//   2. The reCAPTCHA Enterprise API is enabled.
//   3. gcloud beta services identity create --service=identitytoolkit.googleapis.com --project=<project>
//      then grant that service account roles/identitytoolkit.serviceAgent.
// Roll out with `audit` first, watch the reCAPTCHA metrics for a few days, then `enforce`.
import 'dotenv/config';
import admin from 'firebase-admin';
import type { RecaptchaConfig } from 'firebase-admin/auth';
import fs from 'fs';

// Requests scoring 0.0 to this value (0.0 = likely bot, 1.0 = likely human) are blocked
// under `enforce`. 0.3 is Google's example. (The Admin SDK's type comment describes the
// range the other way round; the Identity Platform REST docs give [0, endScore].)
const BLOCK_AT_OR_BELOW = 0.3;

const STATES = { off: 'OFF', audit: 'AUDIT', enforce: 'ENFORCE' } as const;

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

const describe = (config: RecaptchaConfig | undefined) =>
  JSON.stringify(
    {
      emailPasswordEnforcementState:
        config?.emailPasswordEnforcementState ?? 'OFF',
      managedRules: config?.managedRules ?? [],
    },
    null,
    2,
  );

(async () => {
  const arg = process.argv[2]?.toLowerCase();
  if (arg !== 'status' && !(arg && arg in STATES)) {
    console.error(
      'Usage: ts-node tools/emailLinkRecaptcha.ts <status|audit|enforce|off>',
    );
    process.exit(1);
  }
  const configs = admin.auth().projectConfigManager();
  try {
    const current = await configs.getProjectConfig();
    console.log(
      `Current email reCAPTCHA config:\n${describe(current.recaptchaConfig)}`,
    );
    if (arg === 'status') process.exit(0);

    const updated = await configs.updateProjectConfig({
      recaptchaConfig: {
        emailPasswordEnforcementState: STATES[arg as keyof typeof STATES],
        managedRules: [{ endScore: BLOCK_AT_OR_BELOW, action: 'BLOCK' }],
      },
    });
    console.log(
      `Updated email reCAPTCHA config:\n${describe(updated.recaptchaConfig)}`,
    );
    process.exit(0);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Failed to update the reCAPTCHA config:', msg);
    console.error(
      'Check the prerequisites at the top of this file (Identity Platform upgrade, reCAPTCHA Enterprise API, service agent role).',
    );
    process.exit(2);
  }
})();
