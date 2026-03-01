import 'dotenv/config';
import admin from 'firebase-admin';
// function getPrivateKey(): string | undefined {
//   const key = process.env.FIREBASE_PRIVATE_KEY;
//   if (!key) return undefined;
  
//   const cleaned = key.replace(/\\n/g, '\n').trim();
  
//   // DEBUGGING: This will help us verify the key is loaded without leaking it
//   console.log('Key Check:', {
//     length: cleaned.length,
//     startsWith: cleaned.startsWith('-----BEGIN PRIVATE KEY-----'),
//     endsWith: cleaned.endsWith('-----END PRIVATE KEY-----')
//   });

//   return cleaned;
// }

if (!admin.apps.length) {
  try {
    let credential;

    // Try FIREBASE_SERVICE_ACCOUNT_KEY first (full JSON)
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (serviceAccountKey) {
      const serviceAccount = JSON.parse(serviceAccountKey);
      credential = admin.credential.cert(serviceAccount);
    } else {
      // Fallback to individual variables
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      const privateKey = process.env.FIREBASE_PRIVATE_KEY;
      const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

      if (!clientEmail || !privateKey || !projectId) {
        throw new Error('Missing Firebase credentials. Set either FIREBASE_SERVICE_ACCOUNT_KEY or FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY, and NEXT_PUBLIC_FIREBASE_PROJECT_ID');
      }

      credential = admin.credential.cert({
        clientEmail,
        privateKey: privateKey.replace(/\\n/g, '\n'),
        projectId,
      });
    }

    admin.initializeApp({ credential });
    console.log('Firebase Admin SDK initialized successfully');
  } catch (error) {
    console.error('Failed to initialize Firebase Admin SDK:', error);
    throw error;
  }
}

export const adminAuth = admin.auth();
export const adminDb = admin.firestore();
