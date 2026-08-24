import { doc, getDoc, setDoc, serverTimestamp, onSnapshot, DocumentData } from 'firebase/firestore';
import { db } from '@/lib/firebase-client';

export interface BlogReactions {
  likes: number;
  dislikes: number;
  shares: number;
}

export type ReactionDirection = 'like' | 'dislike';

const REACTION_KEY = (postId: string) => `blog_reaction_${postId}`;
const SHARED_KEY = (postId: string) => `blog_shared_${postId}`;

function num(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function readLocal(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeLocal(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* localStorage unavailable (sandboxed) — ignore */
  }
}

function reactionRef(postId: string) {
  return doc(db, 'blogReactions', postId);
}

export const getBlogReactions = async (postId: string): Promise<BlogReactions> => {
  const snap = await getDoc(reactionRef(postId));
  const data: DocumentData | undefined = snap.exists() ? snap.data() : undefined;
  return { likes: num(data?.likes), dislikes: num(data?.dislikes), shares: num(data?.shares) };
};

/** The device's current choice for a post, restored from localStorage. */
export const getStoredReaction = (postId: string): ReactionDirection | null => {
  const v = readLocal(REACTION_KEY(postId));
  return v === 'like' || v === 'dislike' ? v : null;
};

/**
 * Apply a like/dislike click for the device. Toggles off when clicking the
 * already-active direction, switches otherwise. Counts are read-modify-write so
 * Firestore rules can validate the +/-1 delta. Returns the new authoritative
 * counts and the resulting device choice.
 */
export async function applyBlogReaction(
  postId: string,
  direction: ReactionDirection,
  userChoice: ReactionDirection | null
): Promise<{ counts: BlogReactions; userChoice: ReactionDirection | null }> {
  const snap = await getDoc(reactionRef(postId));
  const data: DocumentData | undefined = snap.exists() ? snap.data() : undefined;
  const likes = num(data?.likes);
  const dislikes = num(data?.dislikes);
  const shares = num(data?.shares);

  let nextLikes = likes;
  let nextDislikes = dislikes;
  let nextChoice: ReactionDirection | null;

  if (userChoice === direction) {
    // Toggle off.
    if (direction === 'like') nextLikes = Math.max(0, likes - 1);
    else nextDislikes = Math.max(0, dislikes - 1);
    nextChoice = null;
  } else {
    if (userChoice === 'like') nextLikes = Math.max(0, likes - 1);
    if (userChoice === 'dislike') nextDislikes = Math.max(0, dislikes - 1);
    if (direction === 'like') nextLikes += 1;
    else nextDislikes += 1;
    nextChoice = direction;
  }

  await setDoc(
    reactionRef(postId),
    { likes: nextLikes, dislikes: nextDislikes, shares, updatedAt: serverTimestamp() },
    { merge: true }
  );
  writeLocal(REACTION_KEY(postId), nextChoice ?? '');

  return { counts: { likes: nextLikes, dislikes: nextDislikes, shares }, userChoice: nextChoice };
}

/** Record a share, at most once per device per post. Returns true if it counted. */
export async function incrementBlogShare(postId: string): Promise<boolean> {
  const key = SHARED_KEY(postId);
  if (readLocal(key)) return false;
  writeLocal(key, '1');
  try {
    const snap = await getDoc(reactionRef(postId));
    const data: DocumentData | undefined = snap.exists() ? snap.data() : undefined;
    const shares = num(data?.shares) + 1;
    await setDoc(
      reactionRef(postId),
      {
        likes: num(data?.likes),
        dislikes: num(data?.dislikes),
        shares,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
    return true;
  } catch {
    return false;
  }
}

export const getBlogReactionsCounts = async (ids: string[]): Promise<Record<string, BlogReactions>> => {
  const counts: Record<string, BlogReactions> = {};
  await Promise.all(
    ids.map(async (id) => {
      counts[id] = await getBlogReactions(id);
    })
  );
  return counts;
};

/** Live like/dislike/share counts for the given ids. Returns an unsubscribe function. */
export const subscribeBlogReactions = (
  ids: string[],
  cb: (reactions: Record<string, BlogReactions>) => void,
): (() => void) => {
  const reactions: Record<string, BlogReactions> = {};
  if (!ids.length) {
    cb({});
    return () => {};
  }
  const unsubs = ids.map((id) =>
    onSnapshot(
      doc(db, 'blogReactions', id),
      (snap) => {
        const data = snap.data();
        reactions[id] = {
          likes: num(data?.likes),
          dislikes: num(data?.dislikes),
          shares: num(data?.shares),
        };
        cb({ ...reactions });
      },
      () => { /* ignore permission/network errors — keep last known counts */ },
    ),
  );
  return () => unsubs.forEach((unsub) => unsub());
};
