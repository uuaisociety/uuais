import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import {
  getAuth,
  connectAuthEmulator,
  GoogleAuthProvider,
  GithubAuthProvider,
  OAuthProvider,
  signInWithPopup,
  linkWithPopup,
  signOut,
  User,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Reuse existing app instance if it exists (prevents duplicate-app errors during HMR)
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

// Connect to local emulators in development when explicitly enabled
// (NEXT_PUBLIC_USE_FIREBASE_EMULATORS="true"). No-op otherwise.
declare global {
  var FIREBASE_CLIENT_EMULATORS_CONNECTED: boolean | undefined;
}

if (
  process.env.NODE_ENV === 'development' &&
  process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === 'true' &&
  !globalThis.FIREBASE_CLIENT_EMULATORS_CONNECTED
) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  globalThis.FIREBASE_CLIENT_EMULATORS_CONNECTED = true;
  console.info('Connected to Firebase emulators (auth:9099, firestore:8080)');
}
export const googleProvider = new GoogleAuthProvider();
export const githubProvider = new GithubAuthProvider();
// Microsoft uses a generic OAuthProvider with providerId 'microsoft.com'
export const microsoftProvider = new OAuthProvider('microsoft.com');

export const signInWithGooglePopup = async () => {
  const result = await signInWithPopup(auth, googleProvider);
  await refreshSessionCookie();
  return result.user;
};

export const signInWithGithubPopup = async () => {
  const result = await signInWithPopup(auth, githubProvider);
  await refreshSessionCookie();
  return result.user;
};

export const signInWithMicrosoftPopup = async () => {
  const result = await signInWithPopup(auth, microsoftProvider);
  await refreshSessionCookie();
  return result.user;
};

// Account linking helpers (link additional providers to the same Firebase user)
export const linkGoogleToCurrentUser = async (user: User) => {
  const result = await linkWithPopup(user, googleProvider);
  return result.user;
};

export const linkGithubToCurrentUser = async (user: User) => {
  const result = await linkWithPopup(user, githubProvider);
  return result.user;
};

export const linkMicrosoftToCurrentUser = async (user: User) => {
  const result = await linkWithPopup(user, microsoftProvider);
  return result.user;
};

export const firebaseSignOut = async () => {
  await signOut(auth);
};

/**
 * Refresh the httpOnly session cookie (used by API routes) to the currently
 * signed-in Firebase user. The cookie is only (re)set at /api/login, and the
 * client-side signIn/signOut do not touch it, so after an account switch or a
 * custom-claim (e.g. admin) change the cookie can be stale. Call before any
 * server API request that must authenticate as the current user.
 */
export async function refreshSessionCookie(): Promise<void> {
  const token = await auth.currentUser?.getIdToken(true);
  if (!token) return;
  await fetch('/api/login', {
    headers: { Authorization: `Bearer ${token}` },
    credentials: 'include',
  });
}
