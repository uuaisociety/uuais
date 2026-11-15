'use client';

// The guessing game's static pieces, shared by the page and its loading
// skeleton (the /guess loading boundary), so the skeleton has the page's exact
// geometry. Kept free of the page's data clients: the boundary ships ahead of
// the page.

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

export const SIGNED_OUT_TEXT = 'Sign in to submit your guess.';

/** "Guess the amount of (item)"; `item` is a placeholder while the game loads. */
export const GuessTitle = ({ item }: { item: ReactNode }) => (
  <>
    Guess the amount
    {item && (
      <>
        {' '}
        of <span className="paren">({item})</span>
      </>
    )}
  </>
);

export const ITEM_PLACEHOLDER = (
  <SkeletonText className="inline-block" widths={['5em']} />
);

export const GuessLabel = () => (
  <label htmlFor="guess" className="mono-label text-muted-foreground">
    Your guess
  </label>
);

/**
 * The card's body while the game and account load: the guess form for someone
 * signed in (or signed in here before), otherwise the sign-in prompt.
 */
export const BodySkeleton = ({ signedIn }: { signedIn: boolean }) => (
  <SkeletonRegion label="Loading…">
    {signedIn ? (
      <div inert className={MEMBER_BODY_CLASS}>
        <GuessLabel />
        <div className="mt-2 flex flex-col gap-3 sm:flex-row">
          <span className="block h-11 w-full rounded-md border border-border bg-background sm:flex-1" />
          <SkeletonBox className="h-11 w-full rounded-md sm:w-36" />
        </div>
      </div>
    ) : (
      <div inert>
        <SignInPrompt text={SIGNED_OUT_TEXT} returnPath="/guess" />
      </div>
    )}
  </SkeletonRegion>
);

/** The guessing game while its route loads. `signedIn`: someone was signed in here before. */
export const GuessSkeleton = ({ signedIn }: { signedIn: boolean }) => (
  <MemberCard title={<GuessTitle item={ITEM_PLACEHOLDER} />}>
    <BodySkeleton signedIn={signedIn} />
  </MemberCard>
);
