import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { getAuth, connectAuthEmulator } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Add logging to check if environment variables are loaded
if (!firebaseConfig.projectId) {
  console.error('Firebase projectId is not defined. Environment variables may not be properly loaded.');
  console.log('Current Firebase config:', {
    ...firebaseConfig,
    apiKey: firebaseConfig.apiKey ? '[REDACTED]' : undefined
  });
}
// Reuse existing app instance if it exists (prevents duplicate-app errors during HMR)
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);

// Connect to local emulators in development when explicitly enabled
// Set NEXT_PUBLIC_USE_FIREBASE_EMULATORS="true" to enable
declare global {
  var FIREBASE_EMULATORS_STARTED: boolean | undefined;
}

const useEmulators = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === 'true';

if (useEmulators && !globalThis.FIREBASE_EMULATORS_STARTED) {
  try {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    connectFirestoreEmulator(db, '127.0.0.1', 8082);
    connectStorageEmulator(storage, '127.0.0.1', 9199);
    globalThis.FIREBASE_EMULATORS_STARTED = true;
    console.info('Connected to Firebase emulators (auth:9099, firestore:8080, storage:9199)');
  } catch (e) {
    console.warn('Failed to connect to Firebase emulators:', e);
  }
}