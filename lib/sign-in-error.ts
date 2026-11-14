// Text for a failed Google/GitHub popup sign-in, shared by /login and /join.
// Kept free of Firebase imports so /join can use it without loading the SDK.

/**
 * One account per email: when the address already has an account under another
 * method (e.g. a GitHub member who later used an email link, which replaces the
 * unverified GitHub login), Firebase refuses the popup sign-in with this code.
 */
const ACCOUNT_EXISTS =
  'This email already has an account that uses a different sign-in method. Sign in that way (Google, GitHub or an email link), then link this one under Sign-in methods in your account settings.';

const MESSAGES: Record<string, string> = {
  'auth/account-exists-with-different-credential': ACCOUNT_EXISTS,
  'auth/popup-blocked':
    'Your browser blocked the sign-in window. Allow pop-ups for this site and try again, or use the email option below.',
  'auth/network-request-failed':
    'We couldn’t reach the sign-in service. Check your connection and try again.',
  'auth/too-many-requests':
    'Too many sign-in attempts. Please wait a few minutes and try again.',
  'auth/user-disabled':
    'This account has been disabled. Please contact contact@uuais.com.',
  'auth/web-storage-unsupported':
    'Your browser is blocking the storage sign-in needs. Turn off private mode or allow site data and try again.',
};

// Closing the popup (or clicking twice) is the user's own choice, not an error worth showing.
const DISMISSED = ['auth/popup-closed-by-user', 'auth/cancelled-popup-request'];

const errorCode = (e: unknown): string | undefined => {
  const code = (e as { code?: unknown })?.code;
  return typeof code === 'string' ? code : undefined;
};

/** A plain message for a failed popup sign-in, or null when the user simply closed the popup. */
export const signInErrorMessage = (e: unknown): string | null => {
  const code = errorCode(e);
  if (code && DISMISSED.includes(code)) return null;
  if (code && MESSAGES[code]) return MESSAGES[code];
  // Never show raw "Firebase: Error (auth/…)" strings.
  return 'Sign-in failed. Please try again.';
};
