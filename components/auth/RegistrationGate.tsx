'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAdmin } from '@/hooks/useAdmin';
import { joinUrl } from '@/lib/login-redirect';

// Pages where an unfinished account is sent to /join (anything else stays browsable).
const MEMBER_ONLY_PATHS = ['/account', '/me', '/my-courses'];
// Pages used to finish or re-authenticate, where the reminder would be noise.
const QUIET_PATHS = ['/join', '/login', '/privacy'];

const matches = (paths: string[], pathname: string | null) =>
  paths.some((p) => pathname === p || pathname?.startsWith(p + '/'));

/**
 * A signed-in user who hasn't finished creating their account stays signed in:
 * member-only pages redirect to /join, other pages show a reminder. Membership
 * itself is enforced server-side and by Firestore rules, not here.
 */
export default function RegistrationGate() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, profileLoading, profileError, isPartner } = useAdmin();

  const unfinished =
    Boolean(user) &&
    !isPartner && // partner-company accounts review CVs without a member profile
    !profileLoading && // a complete profile mustn't be read as incomplete while it loads
    !profileError && // a failed read means "unknown", never "unregistered"
    !(Boolean(profile?.isMember) && Boolean(profile?.privacyAcceptedAt));

  const memberOnly = matches(MEMBER_ONLY_PATHS, pathname);

  useEffect(() => {
    if (!unfinished || !memberOnly) return;
    router.replace(joinUrl(pathname + window.location.search));
  }, [unfinished, memberOnly, pathname, router]);

  if (!unfinished || memberOnly || matches(QUIET_PATHS, pathname)) return null;

  return (
    <div
      role="status"
      className="fixed bottom-4 inset-x-4 z-40 mx-auto max-w-md rounded-md border border-yellow-300 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-950 px-4 py-3 text-sm text-yellow-900 dark:text-yellow-100 shadow-lg"
    >
      You&apos;re signed in, but your account isn&apos;t finished yet.{' '}
      <Link
        // Returning to the home page after joining would hide the welcome on /account.
        href={joinUrl(pathname === '/' ? null : pathname)}
        className="font-medium underline underline-offset-2"
      >
        Finish creating your account
      </Link>
    </div>
  );
}
