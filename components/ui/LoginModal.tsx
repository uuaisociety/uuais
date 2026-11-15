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
import {
  LOGIN_COLUMN_CLASS,
  LOGIN_PAGE_CLASS,
  LOGIN_PROVIDERS_CLASS,
  LoginFooter,
  LoginHeading,
  OrSeparator,
} from '@/components/auth/LoginLayout';
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
    <div className={LOGIN_PAGE_CLASS}>
      <div className={LOGIN_COLUMN_CLASS}>
        <LoginHeading />
        <div className={LOGIN_PROVIDERS_CLASS}>
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
        <OrSeparator />
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
        <LoginFooter joinHref={joinHref} />
      </div>
    </div>
  );
};
export default LoginCard;
