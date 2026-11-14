'use client';

import { useState, useSyncExternalStore } from 'react';
import { Button } from '@/components/ui/Button';
import {
  auth,
  signInWithGooglePopup,
  signInWithGithubPopup,
} from '@/lib/firebase-client';
import { getUserProfile, isPartnerEmail } from '@/lib/firestore';
import { useRouter } from 'next/navigation';
import { joinUrl, currentRedirect } from '@/lib/login-redirect';
import EmailLinkSignIn from '@/components/auth/EmailLinkSignIn';
import { signInErrorMessage } from '@/lib/sign-in-error';
import { ensureAuth } from '@/hooks/useAdmin';

import type { FC } from 'react';
import Link from 'next/link';
import { GoogleIcon, GithubIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

interface LoginCardProps {
  after: () => void;
}

// The pending redirect lives in the URL, which the server render can't see.
// Rendering the bare /join on the server and during hydration, then the full
// link right after, keeps the markup identical and avoids a hydration mismatch.
const noSubscribe = () => () => {};
const useJoinHref = () =>
  useSyncExternalStore(
    noSubscribe,
    () => joinUrl(currentRedirect()),
    () => joinUrl(null),
  );

const LoginCard: FC<LoginCardProps> = ({ after }) => {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<'google' | 'github' | null>(null);
  const joinHref = useJoinHref();

  // A provider account that never created a profile can't use member pages;
  // send it to /join to complete account creation, keeping the redirect.
  const finishSignIn = async (uid: string) => {
    // Start the shared auth store now (not after its idle delay), so /join or
    // /account show the signed-in user instead of a signed-out page first.
    ensureAuth();
    // Partner-company accounts (allowlisted by verified email) have no member profile by design.
    const current = auth.currentUser;
    const email = current?.emailVerified ? current.email : null;
    const isPartner = email
      ? await isPartnerEmail(email).catch(() => false)
      : false;
    if (isPartner) {
      after();
      return;
    }
    let completed = true;
    try {
      const profile = await getUserProfile(uid);
      completed =
        Boolean(profile?.isMember) && Boolean(profile?.privacyAcceptedAt);
    } catch (e) {
      console.warn('Failed to load profile after sign-in:', e);
    }
    if (!completed) {
      router.push(joinUrl(currentRedirect()));
      return;
    }
    after();
  };

  const handleAuth = async (
    provider: 'google' | 'github',
    signIn: () => Promise<{ uid: string }>,
  ) => {
    setError(null);
    setPending(provider);
    try {
      const user = await signIn();
      await finishSignIn(user.uid);
    } catch (e) {
      setError(signInErrorMessage(e));
      console.error('Sign-in failed:', e);
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-12 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-xs mx-auto px-4">
        <div className="flex flex-col items-center justify-center pb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white pb-2">
            Sign in
          </h1>
          <p className="text-gray-600 dark:text-gray-300 text-sm text-center">
            Use the same method you used when you joined.
          </p>
        </div>
        <div className="space-y-3 gap-1 flex flex-col justify-center">
          <Button
            variant="outline"
            isLoading={pending === 'google'}
            disabled={pending !== null}
            onClick={() => handleAuth('google', signInWithGooglePopup)}
          >
            <span className="flex items-center gap-2">
              <HugeiconsIcon icon={GoogleIcon} className="h-4 w-4" /> Continue
              with Google
            </span>
          </Button>
          <Button
            variant="outline"
            isLoading={pending === 'github'}
            disabled={pending !== null}
            onClick={() => handleAuth('github', signInWithGithubPopup)}
          >
            <span className="flex items-center gap-2">
              <HugeiconsIcon icon={GithubIcon} className="h-4 w-4" /> Continue
              with GitHub
            </span>
          </Button>
          {/* <Button onClick={() => signInWithMicrosoftPopup().then(after)}>
                        <span className="flex items-center gap-2"><MicrosoftIcon className="h-4 w-4" /> Continue with Microsoft</span>
                    </Button> */}
        </div>
        <div
          role="separator"
          className="flex items-center gap-3 my-5 text-xs text-muted-foreground"
        >
          <span className="h-px flex-1 bg-border" />
          or
          <span className="h-px flex-1 bg-border" />
        </div>
        {/* No Google or GitHub account: a one-time link to any email, which returns here. */}
        <EmailLinkSignIn
          label="Email"
          placeholder="you@example.com"
          contactEmail="contact@uuais.com"
          alternative="continue with Google or GitHub"
          onSignedIn={(user) => finishSignIn(user.uid)}
        />
        {error && (
          <p
            role="alert"
            className="mt-4 text-sm text-red-600 dark:text-red-400 text-center"
          >
            {error}
          </p>
        )}
        <div className="text-center mt-8">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            New here?{' '}
            <Link href={joinHref} className="underline">
              Create an account
            </Link>
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            <Link href="/privacy" className="underline">
              Privacy Policy
            </Link>
            {/* | <Link href="/terms" className="underline">Terms of Service</Link> */}
          </p>
        </div>
      </div>
    </div>
  );
};
export default LoginCard;
