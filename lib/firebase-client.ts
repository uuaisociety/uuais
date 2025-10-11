import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import {
  getAuth,
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
export const googleProvider = new GoogleAuthProvider();
export const githubProvider = new GithubAuthProvider();
// Microsoft uses a generic OAuthProvider with providerId 'microsoft.com'
export const microsoftProvider = new OAuthProvider('microsoft.com');

export const signInWithGooglePopup = async () => {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
};

export const signInWithGithubPopup = async () => {
  const result = await signInWithPopup(auth, githubProvider);
  return result.user;
};

export const signInWithMicrosoftPopup = async () => {
  const result = await signInWithPopup(auth, microsoftProvider);
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
