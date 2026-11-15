'use client';

import { useEffect, useState } from 'react';
import { useAdmin } from '@/hooks/useAdmin';
import { Button } from '@/components/ui/Button';
import {
  MEMBER_BODY_CLASS,
  MemberCard,
  SignInPrompt,
} from '@/components/pages/MemberCard';
import {
  BodySkeleton,
  GuessLabel,
  GuessTitle,
  ITEM_PLACEHOLDER,
  SIGNED_OUT_TEXT,
} from '@/components/pages/GuessLayout';
import { useGuessContest } from '@/lib/firestore/useGuessContest';
import {
  getMyGuess,
  MAX_GUESS_DIGITS,
  submitGuess,
} from '@/lib/firestore/guess-contest';

export default function GuessPage() {
  const { user, loading, cached } = useAdmin({ eager: true });
  const { contest, loaded } = useGuessContest();
  const [value, setValue] = useState('');
  const [savedGuess, setSavedGuess] = useState<number | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const uid = user?.uid;
  const email = user?.email;

  useEffect(() => {
    if (!uid) return;
    getMyGuess(uid)
      .then((guess) => {
        setSavedGuess(guess);
        if (guess !== null) setValue(String(guess));
      })
      .catch(() => {});
  }, [uid]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!uid || !email || value === '' || pending) return;
    setPending(true);
    setError('');
    try {
      const guess = Number(value);
      await submitGuess(uid, email, guess);
      setSavedGuess(guess);
    } catch {
      setError('Could not save your guess. Please try again.');
    } finally {
      setPending(false);
    }
  }

  return (
    <MemberCard
      title={<GuessTitle item={loaded ? contest?.item : ITEM_PLACEHOLDER} />}
    >
      {loading || !loaded ? (
        <BodySkeleton signedIn={Boolean(user || cached)} />
      ) : !contest?.open ? (
        <p className="mt-8 text-base text-muted-foreground sm:text-sm">
          The guessing game isn&apos;t open right now.
        </p>
      ) : !user ? (
        <SignInPrompt text={SIGNED_OUT_TEXT} returnPath="/guess" />
      ) : (
        <form onSubmit={onSubmit} className={MEMBER_BODY_CLASS}>
          <GuessLabel />
          <div className="mt-2 flex flex-col gap-3 sm:flex-row">
            <input
              id="guess"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="off"
              maxLength={MAX_GUESS_DIGITS}
              required
              value={value}
              onChange={(e) => setValue(e.target.value.replace(/\D/g, ''))}
              className="h-11 w-full rounded-md border border-border bg-background px-3 font-mono text-base text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:flex-1"
            />
            <Button
              type="submit"
              size="lg"
              disabled={pending || value === ''}
              className="w-full sm:w-auto"
            >
              {pending
                ? 'Saving…'
                : savedGuess === null
                  ? 'Submit guess'
                  : 'Update guess'}
            </Button>
          </div>
          {savedGuess !== null && (
            <p
              role="status"
              className="mt-4 text-base text-muted-foreground sm:text-sm"
            >
              Your guess of{' '}
              <span className="font-mono text-foreground">{savedGuess}</span> is
              saved
              {email && <> for {email}</>}. You can change it while the game is
              open.
            </p>
          )}
          {!email && (
            <p
              role="alert"
              className="mt-4 text-base text-destructive sm:text-sm"
            >
              Your account has no email address, so we can&apos;t save a guess
              for it.
            </p>
          )}
          {error && (
            <p
              role="alert"
              className="mt-4 text-base text-destructive sm:text-sm"
            >
              {error}
            </p>
          )}
        </form>
      )}
    </MemberCard>
  );
}
