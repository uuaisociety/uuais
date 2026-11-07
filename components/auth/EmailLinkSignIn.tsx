'use client';

import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { User } from 'firebase/auth';
import { Button } from '@/components/ui/Button';
import { FieldGroup, InputBase } from '@/components/ui/Form';
import {
  emailLinkCooldownSeconds,
  isEmailSignInLink,
  sendEmailSignInLink,
  signInWithEmailLinkAfterReady,
  storedEmailForSignIn,
} from '@/lib/firebase-client';

// Passwordless sign-in: a one-time link to the user's email, which returns to
// the page it was requested from. Shared by the partner CV page and member login.

// The custom sender set for sign-in emails under Firebase Authentication → Templates.
const SENDER = 'noreply@uuais.com';

// Firebase appends these to the return URL; anything else (e.g. ?redirect=) is the page's own.
const LINK_PARAMS = [
  'apiKey',
  'oobCode',
  'mode',
  'lang',
  'continueUrl',
  'tenantId',
];

/** The current path and query without the sign-in link's parameters. */
const pageUrl = (): string => {
  const url = new URL(window.location.href);
  LINK_PARAMS.forEach((p) => url.searchParams.delete(p));
  return url.pathname + url.search;
};

// reCAPTCHA (enforced on the email provider) refused the request: a low score
// (VPN, Tor, locked-down browser) or no token at all (the reCAPTCHA script was blocked).
const RECAPTCHA_CODES = [
  'auth/captcha-check-failed',
  'auth/missing-recaptcha-token',
  'auth/invalid-recaptcha-token',
];

const errorMessages = (
  contactEmail: string,
  alternative: string,
): Record<string, string> => ({
  ...Object.fromEntries(
    RECAPTCHA_CODES.map((code) => [
      code,
      `We couldn’t verify this request. Try again without a VPN or in another browser, or ${alternative}.`,
    ]),
  ),
  'auth/invalid-email': 'That doesn’t look like a valid email address.',
  'auth/missing-email': 'Enter your email address.',
  'auth/email-link-mismatch':
    'That email doesn’t match the one the link was sent to.',
  'auth/invalid-action-code':
    'This sign-in link has expired or was already used. Request a new one below.',
  'auth/expired-action-code':
    'This sign-in link has expired or was already used. Request a new one below.',
  'auth/operation-not-allowed': `Email sign-in isn’t available right now. Please contact ${contactEmail}.`,
  'auth/too-many-requests':
    'Too many sign-in attempts. Please wait a few minutes and try again.',
  'auth/quota-exceeded':
    'Too many sign-in emails were sent today. Please try again tomorrow.',
});

const errorCode = (e: unknown): string | undefined => {
  const code = (e as { code?: unknown })?.code;
  return typeof code === 'string' ? code : undefined;
};

type Step = 'idle' | 'sent' | 'confirm' | 'completing';

interface EmailLinkSignInProps {
  /** Label of the email field, e.g. "Work email". */
  label: string;
  placeholder: string;
  /** Who to contact when email sign-in is switched off in Firebase. */
  contactEmail: string;
  /** Another way in, offered when reCAPTCHA refuses the request; defaults to contacting `contactEmail`. */
  alternative?: string;
  /** Checked before any link is sent; false shows `notAllowed` and sends nothing. */
  allowed?: (email: string) => Promise<boolean>;
  notAllowed?: ReactNode;
  /** Runs once the link has signed the user in and been dropped from the URL. */
  onSignedIn: (user: User) => void | Promise<void>;
}

export default function EmailLinkSignIn({
  label,
  placeholder,
  contactEmail,
  alternative = `contact ${contactEmail}`,
  allowed,
  notAllowed,
  onSignedIn,
}: EmailLinkSignInProps) {
  const [step, setStep] = useState<Step>('idle');
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  // A link is single-use: a second attempt (React re-running effects in dev)
  // would fail with invalid-action-code after the first one signed in.
  const linkHandled = useRef(false);

  const ERRORS = errorMessages(contactEmail, alternative);
  const errorMessage = (e: unknown): string =>
    ERRORS[errorCode(e) ?? ''] ?? 'Sign-in failed. Please try again.';

  const complete = async (address: string, href: string) => {
    setStep('completing');
    setError(null);
    try {
      const user = await signInWithEmailLinkAfterReady(address, href);
      // Drop the spent link from the URL, keeping the page's own query.
      window.history.replaceState(null, '', pageUrl());
      await onSignedIn(user);
    } catch (err) {
      console.error('Email-link sign-in failed:', err);
      // Firebase reports a confirmed address that differs from the link's as
      // invalid-email; the link is still good, so let them try the right one.
      if (errorCode(err) === 'auth/invalid-email') {
        setError(ERRORS['auth/email-link-mismatch']);
        setStep('confirm');
        return;
      }
      setError(errorMessage(err));
      window.history.replaceState(null, '', pageUrl());
      setStep('idle');
    }
  };

  // Finish a sign-in when this page was opened from the emailed link. The same
  // browser remembers the address; any other device has to confirm it, so a
  // forwarded link can't sign someone else in.
  useEffect(() => {
    const href = window.location.href;
    if (linkHandled.current || !isEmailSignInLink(href)) return;
    linkHandled.current = true;
    const stored = storedEmailForSignIn();
    /* eslint-disable react-hooks/set-state-in-effect */
    if (stored) void complete(stored, href);
    else setStep('confirm');
    /* eslint-enable react-hooks/set-state-in-effect */
    // Runs once on landing; `complete` closes over nothing that changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotFound(false);
    const address = email.trim();
    if (step === 'confirm') {
      await complete(address, window.location.href);
      return;
    }
    const wait = emailLinkCooldownSeconds();
    if (wait > 0) {
      setError(
        `A sign-in link was just sent. Please wait ${wait} seconds before requesting another.`,
      );
      return;
    }
    setSending(true);
    try {
      // Refused addresses get no email at all, just the not-allowed message.
      if (allowed && !(await allowed(address))) {
        setNotFound(true);
        return;
      }
      await sendEmailSignInLink(
        address,
        `${window.location.origin}${pageUrl()}`,
      );
      setStep('sent');
    } catch (err) {
      setError(
        errorCode(err)
          ? errorMessage(err)
          : err instanceof Error
            ? err.message
            : 'Sign-in failed. Please try again.',
      );
      console.error('Sending sign-in link failed:', err);
    } finally {
      setSending(false);
    }
  };

  return (
    // Centred in a narrow column, like the member login page.
    <div className="w-full max-w-xs mx-auto">
      {step === 'completing' ? (
        <p role="status" className="text-center text-muted-foreground">
          Signing you in…
        </p>
      ) : step === 'sent' ? (
        <div role="status" className="text-center">
          <p className="font-medium text-foreground">Check your inbox</p>
          <p className="text-muted-foreground mt-1 leading-relaxed">
            We sent a sign-in link to {email.trim()}. It works once and expires
            after a while.
          </p>
          <p className="text-muted-foreground mt-2 leading-relaxed">
            Please also check your spam folder for an email from{' '}
            <span className="text-foreground whitespace-nowrap">{SENDER}</span>.
          </p>
          <button
            type="button"
            onClick={() => setStep('idle')}
            className="mt-3 text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors duration-300 cursor-pointer"
          >
            Use a different email
          </button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-3">
          {step === 'confirm' && (
            <p className="text-sm text-muted-foreground leading-relaxed">
              You opened the link on a different device or browser. Confirm the
              email it was sent to, to finish signing in.
            </p>
          )}
          <FieldGroup label={label}>
            <InputBase
              type="email"
              required
              autoComplete="email"
              placeholder={placeholder}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </FieldGroup>
          <Button type="submit" variant="ctaSoft" fullWidth isLoading={sending}>
            {step === 'confirm' ? 'Sign in' : 'Email me a sign-in link'}
          </Button>
        </form>
      )}
      {notFound && notAllowed && (
        <div role="alert" className="mt-4 text-sm text-center">
          {notAllowed}
        </div>
      )}
      {error && (
        <p role="alert" className="mt-4 text-sm text-center text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
