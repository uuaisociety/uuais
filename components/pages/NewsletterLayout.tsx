'use client';

// The newsletter card's static pieces, shared by the page and its loading
// skeleton (the /newsletter loading boundary), so the skeleton has the page's
// exact geometry. Kept free of the page's data clients: the boundary ships
// ahead of the page.

import type { ReactNode } from 'react';
import {
  SkeletonBox,
  SkeletonRegion,
  SkeletonText,
} from '@/components/ui/skeleton';
import {
  MEMBER_BODY_CLASS,
  MemberCard,
  SignInPrompt,
} from '@/components/pages/MemberCard';

export const SIGNED_OUT_TEXT =
  'Sign in with your member account to subscribe or manage your subscription.';

export const NewsletterIntro = () => (
  <p className="mt-4 max-w-prose text-base text-muted-foreground">
    Subscribe to the UU AI Society newsletter. Manage your subscription here
    anytime.
  </p>
);

/** The account line under the hairline: "Account:" and the address. */
export const AccountLine = ({ email }: { email: ReactNode }) => (
  <p className="text-base text-muted-foreground sm:text-sm">
    Account:{' '}
    <span className="mt-1 block text-foreground [overflow-wrap:anywhere]">
      {email}
    </span>
  </p>
);

/**
 * The card's body while the account loads: a member's subscription panel when
 * someone is (or was last) signed in, otherwise the sign-in prompt.
 */
export const BodySkeleton = ({
  email,
  returnPath,
}: {
  email: string | null | undefined;
  returnPath: string;
}) => (
  <SkeletonRegion label="Loading your account…">
    {email !== undefined ? (
      <div className={MEMBER_BODY_CLASS}>
        <AccountLine
          email={
            email || (
              <SkeletonText className="inline-block" widths={['12rem']} />
            )
          }
        />
        <SkeletonText
          className="mt-3 text-base sm:text-sm"
          widths={['14rem']}
        />
        <SkeletonBox className="mt-5 h-11 w-full rounded-md sm:w-32" />
      </div>
    ) : (
      <div inert>
        <SignInPrompt text={SIGNED_OUT_TEXT} returnPath={returnPath} />
      </div>
    )}
  </SkeletonRegion>
);

/** The newsletter page while its route loads. `cached` is the last signed-in identity, if any. */
export const NewsletterSkeleton = ({
  cached,
}: {
  cached: { email: string | null } | null;
}) => (
  <MemberCard title="Newsletter">
    <NewsletterIntro />
    <BodySkeleton
      email={cached ? cached.email : undefined}
      returnPath="/newsletter"
    />
  </MemberCard>
);
