'use client';

import { useEffect, useState } from 'react';
import type { GuessContest } from '@/lib/firestore/guess-contest';

/** Live guessing-game settings, dynamically imported like useOpenCampaigns so the header stays off the Firestore critical path. */
export function useGuessContest(): {
  contest: GuessContest | null;
  loaded: boolean;
} {
  const [contest, setContest] = useState<GuessContest | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | null = null;
    void import('@/lib/firestore/guess-contest')
      .then(({ subscribeGuessContest }) => {
        if (!active) return;
        unsubscribe = subscribeGuessContest((next) => {
          if (!active) return;
          setContest(next);
          setLoaded(true);
        });
      })
      .catch((e) => {
        console.warn('Guess-contest subscription error:', e);
        if (active) setLoaded(true);
      });
    return () => {
      active = false;
      try {
        unsubscribe?.();
      } catch (e) {
        console.warn('Guess-contest teardown error:', e);
      }
    };
  }, []);

  return { contest, loaded };
}
