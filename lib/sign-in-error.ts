// Text for a failed Google/GitHub popup sign-in, shared by /login and /join.
// Kept free of Firebase imports so /join can use it without loading the SDK.

/**
 * One account per email: when the address already has an account under another
 * method (e.g. a GitHub member who later used an email link, which replaces the
 * unverified GitHub login), Firebase refuses the popup sign-in with this code.
 */
const ACCOUNT_EXISTS =
  'This email already has an account that uses a different sign-in method. Sign in that way (Google, GitHub or an email link), then link this one under Linked Accounts in your account settings.';

export const signInErrorMessage = (e: unknown): string =>
  (e as { code?: unknown })?.code ===
  'auth/account-exists-with-different-credential'
    ? ACCOUNT_EXISTS
    : e instanceof Error
      ? e.message
      : 'Sign-in failed. Please try again.';
