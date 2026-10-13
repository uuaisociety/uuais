'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { refreshProfile, useAdmin } from '@/hooks/useAdmin';
import { Button } from '@/components/ui/Button';
import { joinUrl, loginUrl } from '@/lib/login-redirect';

type NewsletterPageProps = {
  requestedSubscription?: boolean | null;
};

export default function NewsletterPage({
  requestedSubscription = null,
}: NewsletterPageProps) {
  const { user, profile, loading, profileLoading } = useAdmin({ eager: true });
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

  const updateSubscription = useCallback(
    async (
      newsletter: boolean,
      clearRequest = requestedSubscription !== null,
      requestKey = user && requestedSubscription !== null
        ? `${user.uid}:${requestedSubscription}`
        : null,
    ) => {
      if (!canManage || pending) return;
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
    [canManage, pending, requestedSubscription, router, user],
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
    if (!user || !canManage || pending) return;
    const attempt = `${user.uid}:${requestedSubscription}`;
    if (autoAttempt.current === attempt) return;
    autoAttempt.current = attempt;
    void updateSubscription(requestedSubscription, true, attempt);
  }, [canManage, pending, requestedSubscription, updateSubscription, user]);

  const returnPath =
    requestedSubscription === null
      ? '/newsletter'
      : `/newsletter?subscribe=${requestedSubscription}`;

  return (
    <section className="mx-auto max-w-xl px-4 pt-8 pb-12 sm:px-6 sm:py-28">
      <div className="rounded-xl border border-border bg-card/70 p-5 glass-shadow sm:p-8">
        <p className="mono-label text-muted-foreground">UU AI SOCIETY</p>
        <h1 className="display-lg mt-3">Newsletter</h1>
        <p className="mt-4 max-w-prose text-base text-muted-foreground">
          Subscribe to the UU AI Society newsletter. Manage your subscription
          here anytime.
        </p>

        {loading || (user && profileLoading) ? (
          <p
            role="status"
            className="mt-8 text-base text-muted-foreground sm:text-sm"
          >
            Loading your account…
          </p>
        ) : !user ? (
          <div className="mt-8">
            <p className="text-base text-muted-foreground sm:text-sm">
              Log in with your member account to subscribe or manage your
              subscription.
            </p>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <Button asChild size="lg" className="w-full sm:w-auto">
                <Link href={loginUrl(returnPath)}>Log in</Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="w-full sm:w-auto"
              >
                <Link href={joinUrl(returnPath)}>Create an account</Link>
              </Button>
            </div>
          </div>
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
          </div>
        ) : (
          <div className="mt-8 border-t border-border pt-6">
            {profile?.email && (
              <p className="text-base text-muted-foreground sm:text-sm">
                Account:{' '}
                <span className="mt-1 block text-foreground [overflow-wrap:anywhere]">
                  {profile.email}
                </span>
              </p>
            )}
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
      </div>
    </section>
  );
}
