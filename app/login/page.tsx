'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import LoginModal from '@/components/ui/LoginModal';
import { Button } from '@/components/ui/Button';
import { useAdmin } from '@/hooks/useAdmin';
import { updatePageMeta } from '@/utils/seo';
import { currentRedirect, joinUrl } from '@/lib/login-redirect';

export default function LoginPage() {
  const router = useRouter();
  const { user, profile, profileLoading, profileError, isPartner, logout } =
    useAdmin();

  useEffect(() => {
    updatePageMeta('Sign In', 'Sign in to your UU AI Society account');
  }, []);

  const after = () => {
    router.push(currentRedirect() || '/account');
  };

  // Read once on mount so the param survives the /join detour.
  const [redirect] = useState<string | null>(() => currentRedirect());

  // Already signed in (e.g. opened /login from a bookmark): say so instead of showing the form again.
  if (user && !profileLoading) {
    const completed =
      isPartner ||
      profileError || // unknown, not missing: let /account show the retry
      (Boolean(profile?.isMember) && Boolean(profile?.privacyAcceptedAt));
    const who = profile?.displayName || profile?.name || user.email;
    return (
      <div className="min-h-screen pt-24 pb-12 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-xs mx-auto px-4 text-center space-y-4">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Sign in
          </h1>
          <p className="text-gray-700 dark:text-gray-300">
            You&apos;re signed in{who ? ` as ${who}` : ''}
            {completed ? '.' : ', but your account isn’t finished yet.'}
          </p>
          <div className="flex flex-col gap-3">
            {completed ? (
              <Button asChild variant="default">
                <Link href={redirect || '/account'}>
                  {redirect ? 'Continue' : 'Go to my account'}
                </Link>
              </Button>
            ) : (
              <Button asChild variant="default">
                <Link href={joinUrl(redirect)}>
                  Finish creating your account
                </Link>
              </Button>
            )}
            <Button variant="outline" onClick={() => void logout()}>
              Sign out
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return <LoginModal after={after} />;
}
