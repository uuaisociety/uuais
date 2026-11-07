/**
 * "Guess the amount of X" game for fairs. Admins set what X is and open or close the game in
 * config/guess_contest; each signed-in user has one guess at guesses/{uid}, which rules tie to
 * their auth email and only accept while the game is open.
 */

import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase-client';

const configRef = () => doc(db, 'config', 'guess_contest');
export const GUESSES_COLLECTION = 'guesses';
/** Nine digits; firestore.rules enforces the same ceiling. */
export const MAX_GUESS_DIGITS = 9;

export interface GuessContest {
  /** What people are guessing the amount of, e.g. "candy in the jar". */
  item: string;
  open: boolean;
}

export interface Guess {
  id: string;
  email: string;
  guess: number;
  updatedAt: Date | null;
}

const DEFAULT_CONTEST: GuessContest = { item: '', open: false };

export function subscribeGuessContest(
  callback: (contest: GuessContest) => void,
): () => void {
  return onSnapshot(
    configRef(),
    (snapshot) => {
      const data = snapshot.data();
      callback({
        item: typeof data?.item === 'string' ? data.item : DEFAULT_CONTEST.item,
        open: data?.open === true,
      });
    },
    (error) => {
      console.error('Firestore subscription failed:', error);
      callback(DEFAULT_CONTEST);
    },
  );
}

export async function saveGuessContest(contest: GuessContest): Promise<void> {
  await setDoc(configRef(), contest);
}

export async function getMyGuess(uid: string): Promise<number | null> {
  const snapshot = await getDoc(doc(db, GUESSES_COLLECTION, uid));
  const guess = snapshot.data()?.guess;
  return typeof guess === 'number' ? guess : null;
}

export async function submitGuess(
  uid: string,
  email: string,
  guess: number,
): Promise<void> {
  await setDoc(doc(db, GUESSES_COLLECTION, uid), {
    email,
    guess,
    updatedAt: serverTimestamp(),
  });
}

export function subscribeGuesses(
  callback: (guesses: Guess[]) => void,
): () => void {
  return onSnapshot(
    collection(db, GUESSES_COLLECTION),
    (snapshot) => {
      callback(
        snapshot.docs.map((entry) => {
          const data = entry.data();
          return {
            id: entry.id,
            email: data.email,
            guess: data.guess,
            updatedAt: data.updatedAt?.toDate?.() ?? null,
          };
        }),
      );
    },
    (error) => {
      console.error('Firestore subscription failed:', error);
      callback([]);
    },
  );
}
