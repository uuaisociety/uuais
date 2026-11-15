'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { refreshProfile, useAdmin } from '@/hooks/useAdmin';
import { Button } from '@/components/ui/Button';
import { joinUrl } from '@/lib/login-redirect';
import {
  MEMBER_BODY_CLASS,
  MemberCard,
  SignInPrompt,
} from '@/components/pages/MemberCard';
import {
  AccountLine,
  BodySkeleton,
  NewsletterIntro,
  SIGNED_OUT_TEXT,
} from '@/components/pages/NewsletterLayout';

type NewsletterPageProps = {
  requestedSubscription?: boolean | null;
};

export default function NewsletterPage({
  requestedSubscription = null,
}: NewsletterPageProps) {
  const { user, profile, loading, profileLoading, cached } = useAdmin({
    eager: true,
  });
  const router = useRouter();
  const autoAttempt = useRef<string | null>(null);
  const latestIntent = useRef<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const isReady = Boolean(
    profile?.isMember && profile.privacyAcceptedAt?.trim(),
  );
  const canManage = Boolean(user && !loading && !profileLoading && isReady);
  // Unsubscribing needs no membership, so a lapsed member can still leave.
  const canUnsubscribe = Boolean(
    user && !loading && !profileLoading && profile?.newsletter === true,
  );

  const updateSubscription = useCallback(
    async (
      newsletter: boolean,
      clearRequest = requestedSubscription !== null,
      requestKey = user && requestedSubscription !== null
        ? `${user.uid}:${requestedSubscription}`
        : null,
    ) => {
      if (!(newsletter ? canManage : canManage || canUnsubscribe) || pending)
        return;
      setPending(true);
      setError('');
      setMessage('');
      try {
        const response = await fetch('/api/newsletter', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ newsletter }),
        });
        if (!response.ok)
          throw new Error(
            'Could not update your subscription. Please try again.',
          );
        await refreshProfile();
        if (requestKey === null || latestIntent.current === requestKey) {
          if (clearRequest) router.replace('/newsletter', { scroll: false });
          setMessage(
            newsletter
              ? 'You are subscribed to the newsletter.'
              : 'You are unsubscribed from the newsletter.',
          );
        }
      } catch (err) {
        if (requestKey === null || latestIntent.current === requestKey) {
          setError(
            err instanceof Error
              ? err.message
              : 'Could not update your subscription. Please try again.',
          );
        }
      } finally {
        setPending(false);
      }
    },
    [canManage, canUnsubscribe, pending, requestedSubscription, router, user],
  );

  useEffect(() => {
    latestIntent.current =
      user && requestedSubscription !== null
        ? `${user.uid}:${requestedSubscription}`
        : null;
  }, [requestedSubscription, user]);

  useEffect(() => {
    if (requestedSubscription === null) {
      autoAttempt.current = null;
      return;
    }
    const allowed = requestedSubscription
      ? canManage
      : canManage || canUnsubscribe;
    if (!user || !allowed || pending) return;
    const attempt = `${user.uid}:${requestedSubscription}`;
    if (autoAttempt.current === attempt) return;
    autoAttempt.current = attempt;
    void updateSubscription(requestedSubscription, true, attempt);
  }, [
    canManage,
    canUnsubscribe,
    pending,
    requestedSubscription,
    updateSubscription,
    user,
  ]);

  const returnPath =
    requestedSubscription === null
      ? '/newsletter'
      : `/newsletter?subscribe=${requestedSubscription}`;

  return (
    <MemberCard title="Newsletter">
      <NewsletterIntro />

      {loading || (user && profileLoading) ? (
        <BodySkeleton
          email={user ? user.email : cached ? cached.email : undefined}
          returnPath={returnPath}
        />
      ) : !user ? (
        <SignInPrompt text={SIGNED_OUT_TEXT} returnPath={returnPath} />
      ) : !isReady ? (
        <div className="mt-8">
          <p className="text-base text-muted-foreground sm:text-sm">
            Complete your website membership to manage the newsletter.
          </p>
          <Button
            asChild
            size="lg"
            className="mt-5 w-full whitespace-normal px-3 sm:w-auto"
          >
            <Link href={joinUrl(returnPath)}>Complete membership</Link>
          </Button>
          {profile?.newsletter === true && (
            <>
              <p className="mt-6 text-base sm:text-sm" role="status">
                You are currently subscribed.
              </p>
              <Button
                size="lg"
                variant="outline"
                className="mt-3 w-full sm:w-auto"
                disabled={pending}
                onClick={() => void updateSubscription(false)}
              >
                {pending ? 'Saving…' : 'Unsubscribe'}
              </Button>
            </>
          )}
          {error && (
            <p
              role="alert"
              className="mt-4 text-base text-destructive sm:text-sm"
            >
              {error}
            </p>
          )}
          {message && (
            <p
              role="status"
              className="mt-4 text-base text-muted-foreground sm:text-sm"
            >
              {message}
            </p>
          )}
        </div>
      ) : (
        <div className={MEMBER_BODY_CLASS}>
          {profile?.email && <AccountLine email={profile.email} />}
          <p className="mt-3 text-base sm:text-sm" role="status">
            {profile?.newsletter === true
              ? 'You are currently subscribed.'
              : 'You are currently unsubscribed.'}
          </p>
          <Button
            size="lg"
            className="mt-5 w-full sm:w-auto"
            disabled={pending}
            onClick={() =>
              void updateSubscription(profile?.newsletter !== true)
            }
          >
            {pending
              ? 'Saving…'
              : profile?.newsletter === true
                ? 'Unsubscribe'
                : 'Subscribe'}
          </Button>
          {error && (
            <p
              role="alert"
              className="mt-4 text-base text-destructive sm:text-sm"
            >
              {error}
            </p>
          )}
          {message && (
            <p
              role="status"
              className="mt-4 text-base text-muted-foreground sm:text-sm"
            >
              {message}
            </p>
          )}
        </div>
      )}
    </MemberCard>
  );
}
