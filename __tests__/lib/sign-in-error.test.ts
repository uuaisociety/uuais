import { signInErrorMessage } from '@/lib/sign-in-error';

const firebaseError = (code: string) =>
  Object.assign(new Error(`Firebase: Error (${code}).`), { code });

describe('signInErrorMessage', () => {
  it.each(['auth/popup-closed-by-user', 'auth/cancelled-popup-request'])(
    'returns null when the user dismissed the popup (%s)',
    (code) => {
      expect(signInErrorMessage(firebaseError(code))).toBeNull();
    },
  );

  it('explains a blocked popup and offers the email option', () => {
    expect(signInErrorMessage(firebaseError('auth/popup-blocked'))).toMatch(
      /blocked the sign-in window.*email option/,
    );
  });

  it('explains a network failure', () => {
    expect(
      signInErrorMessage(firebaseError('auth/network-request-failed')),
    ).toMatch(/Check your connection/);
  });

  it('explains how to sign in when the email already has another method', () => {
    expect(
      signInErrorMessage(
        firebaseError('auth/account-exists-with-different-credential'),
      ),
    ).toMatch(/different sign-in method/);
  });

  it('never shows a raw Firebase error string', () => {
    const message = signInErrorMessage(firebaseError('auth/internal-error'));
    expect(message).toBe('Sign-in failed. Please try again.');
    expect(signInErrorMessage(new Error('boom'))).toBe(
      'Sign-in failed. Please try again.',
    );
  });
});
