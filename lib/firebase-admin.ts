import 'dotenv/config';
import admin from 'firebase-admin';
function getPrivateKey(): string | undefined {
  const key = process.env.FIREBASE_PRIVATE_KEY;
  if (!key) return undefined;
  
  const cleaned = key.replace(/\\n/g, '\n').trim();
  
  // DEBUGGING: This will help us verify the key is loaded without leaking it
  console.log('Key Check:', {
    length: cleaned.length,
    startsWith: cleaned.startsWith('-----BEGIN PRIVATE KEY-----'),
    endsWith: cleaned.endsWith('-----END PRIVATE KEY-----')
  });

  return cleaned;
}

if (!admin.apps.length) {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = getPrivateKey();

  if (!projectId || !clientEmail || !privateKey) {
    console.error('Missing Firebase admin credentials for server-side operations.', {
      hasProjectId: !!projectId,
      hasClientEmail: !!clientEmail,
      hasPrivateKey: !!privateKey,
    });
  }

  try {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
    });
    // admin.initializeApp({
    //   credential: admin.credential.cert({
    //     projectId,
    //     clientEmail,
    //     privateKey,
    //   }),
    // });
    console.log('Firebase Admin SDK initialized successfully');
  } catch (error) {
    console.error('Failed to initialize Firebase Admin SDK:', error);
    throw error;
  }
}

export const adminAuth = admin.auth();
export const adminDb = admin.firestore();
