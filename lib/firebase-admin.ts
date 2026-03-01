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
  // 1. Get the stringified JSON from Vercel environment variables
  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  if (!serviceAccountKey) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY is missing from environment variables');
  }

  try {
    // 2. Parse the string into a real Javascript Object
    const serviceAccount = JSON.parse(serviceAccountKey);

    admin.initializeApp({
      // 3. Use .cert() instead of .applicationDefault()
      credential: admin.credential.cert(serviceAccount),
    });
    
    console.log('Firebase Admin SDK initialized successfully');
  } catch (error) {
    console.error('Failed to initialize Firebase Admin SDK:', error);
    throw error;
  }
}

export const adminAuth = admin.auth();
export const adminDb = admin.firestore();
