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
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
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

// Wait for the initial persisted-user lookup before signing in; otherwise a slow
// initialization can finish after the popup and clear the newly signed-in user.
const signInWithPopupAfterReady = async (
  provider: Parameters<typeof signInWithPopup>[1],
) => {
  await auth.authStateReady();
  const result = await signInWithPopup(auth, provider);
  await refreshSessionCookie();
  return result.user;
};

export const signInWithGooglePopup = () =>
  signInWithPopupAfterReady(googleProvider);

export const signInWithGithubPopup = () =>
  signInWithPopupAfterReady(githubProvider);

export const signInWithMicrosoftPopup = () =>
  signInWithPopupAfterReady(microsoftProvider);

// Passwordless email-link sign-in, for addresses no OAuth provider covers (e.g.
// a partner's Microsoft 365 work email). Using the link verifies the email.
// The address is remembered so the same browser can finish without re-typing it;
// a link opened elsewhere must re-confirm it, which stops a forwarded link
// signing someone else in.
const EMAIL_FOR_SIGN_IN_KEY = 'emailForSignIn';

export const sendEmailSignInLink = async (
  email: string,
  continueUrl: string,
) => {
  await sendSignInLinkToEmail(auth, email, {
    url: continueUrl,
    handleCodeInApp: true,
  });
  try {
    window.localStorage.setItem(EMAIL_FOR_SIGN_IN_KEY, email);
  } catch {
    // Storage blocked: the user re-confirms their email when opening the link.
  }
};

export const isEmailSignInLink = (href: string) =>
  isSignInWithEmailLink(auth, href);

export const storedEmailForSignIn = (): string | null => {
  try {
    return window.localStorage.getItem(EMAIL_FOR_SIGN_IN_KEY);
  } catch {
    return null;
  }
};

export const signInWithEmailLinkAfterReady = async (
  email: string,
  href: string,
) => {
  await auth.authStateReady();
  const result = await signInWithEmailLink(auth, email, href);
  try {
    window.localStorage.removeItem(EMAIL_FOR_SIGN_IN_KEY);
  } catch {
    // Nothing to clean up.
  }
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
  // The token was just minted by sign-in; forcing a refresh adds a failure mode
  // where SDK token invalidation signs the user back out.
  const token = await auth.currentUser?.getIdToken();
  if (!token) return;
  await fetch('/api/login', {
    headers: { Authorization: `Bearer ${token}` },
    credentials: 'include',
  });
}
