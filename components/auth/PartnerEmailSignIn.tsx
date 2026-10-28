'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { FieldGroup, InputBase } from '@/components/ui/Form';
import PartnerNotFound from '@/components/auth/PartnerNotFound';
import {
  isEmailSignInLink,
  sendEmailSignInLink,
  signInWithEmailLinkAfterReady,
  storedEmailForSignIn,
} from '@/lib/firebase-client';

// The only sign-in on the partner CV page: a one-time link to the partner's
// work email. Using the link verifies the address, which the allowlist needs.
const PAGE = '/partners/cvs';

// The custom sender set for sign-in emails under Firebase Authentication → Templates.
const SENDER = 'noreply@uuais.com';

const ERRORS: Record<string, string> = {
  'auth/invalid-email': 'That doesn’t look like a valid email address.',
  'auth/missing-email': 'Enter your email address.',
  'auth/email-link-mismatch':
    'That email doesn’t match the one the link was sent to.',
  'auth/invalid-action-code':
    'This sign-in link has expired or was already used. Request a new one below.',
  'auth/expired-action-code':
    'This sign-in link has expired or was already used. Request a new one below.',
  'auth/operation-not-allowed':
    'Email sign-in isn’t available right now. Please contact partnerships@uuais.com.',
  'auth/quota-exceeded':
    'Too many sign-in emails were sent today. Please try again tomorrow.',
};

const errorCode = (e: unknown): string | undefined => {
  const code = (e as { code?: unknown })?.code;
  return typeof code === 'string' ? code : undefined;
};

/** Whether the address is an admin or an approved partner, checked before any link is sent. */
const checkApproved = async (email: string): Promise<boolean> => {
  const res = await fetch('/api/partners/check-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  const data = (await res.json().catch(() => null)) as {
    approved?: boolean;
    error?: string;
  } | null;
  if (!res.ok)
    throw new Error(
      data?.error || 'Could not check your email. Please try again.',
    );
  return data?.approved === true;
};

const errorMessage = (e: unknown): string =>
  ERRORS[errorCode(e) ?? ''] ?? 'Sign-in failed. Please try again.';

type Step = 'idle' | 'sent' | 'confirm' | 'completing';

export default function PartnerEmailSignIn() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('idle');
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  // A link is single-use: a second attempt (React re-running effects in dev)
  // would fail with invalid-action-code after the first one signed in.
  const linkHandled = useRef(false);

  const complete = async (address: string, href: string) => {
    setStep('completing');
    setError(null);
    try {
      await signInWithEmailLinkAfterReady(address, href);
      // Drop the spent link from the URL, then re-render the server page with
      // the new session: it shows the CVs, or the no-access message.
      router.replace(PAGE);
      router.refresh();
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
      window.history.replaceState(null, '', PAGE);
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
    setSending(true);
    try {
      // Unknown addresses get no email at all, just the not-found message.
      if (!(await checkApproved(address))) {
        setNotFound(true);
        return;
      }
      await sendEmailSignInLink(address, `${window.location.origin}${PAGE}`);
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
    <div className="max-w-xs mx-auto">
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
          <FieldGroup label="Work email">
            <InputBase
              type="email"
              required
              autoComplete="email"
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </FieldGroup>
          <Button type="submit" variant="ctaSoft" fullWidth isLoading={sending}>
            {step === 'confirm' ? 'Sign in' : 'Email me a sign-in link'}
          </Button>
        </form>
      )}
      {notFound && (
        <div role="alert" className="mt-4 text-sm text-center">
          <PartnerNotFound />
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
