import { collection, query, orderBy, where, getDocs, addDoc, updateDoc, deleteDoc, doc, getDoc, setDoc, serverTimestamp, DocumentData, onSnapshot, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase-client';
import { BlogPost } from '@/types';
import { stripUndefined } from './utils';
import { slugify } from '@/lib/slugify';
import { removeUsedNewsUrls } from './blog-seen';

async function ensureUniqueSlug(base: string, currentId: string): Promise<string> {
  const postsRef = collection(db, 'blogPosts');
  const q = query(postsRef, where('slug', '==', base), limit(1));
  const snapshot = await getDocs(q);
  const clash = snapshot.docs.find((d) => d.id !== currentId);
  if (!clash) return base;
  return `${base}-${currentId.slice(-4)}`;
}

export const getBlogPosts = async (): Promise<BlogPost[]> => {
  const postsRef = collection(db, 'blogPosts');
  const q = query(postsRef, where('published', '==', true), orderBy('date', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BlogPost));
};

export const getBlogPostById = async (id: string): Promise<BlogPost | null> => {
  const postRef = doc(db, 'blogPosts', id);
  const postSnap = await getDoc(postRef);
  return postSnap.exists() ? ({ id: postSnap.id, ...postSnap.data() } as BlogPost) : null;
};

export const addBlogPost = async (post: Omit<BlogPost, 'id'>): Promise<string> => {
  const postsRef = collection(db, 'blogPosts');
  const docRef = await addDoc(postsRef, post);
  try {
    const base = slugify(post.title);
    const slug = await ensureUniqueSlug(base, docRef.id);
    await updateDoc(docRef, { slug });
  } catch (err) {
    // Slug assignment is best-effort — posts remain reachable via their Firestore id.
    console.warn('Failed to assign blog post slug:', err);
  }
  try {
    const analyticsRef = doc(db, 'analyticsBlogs', docRef.id);
    await setDoc(analyticsRef, { reads: 0, updatedAt: serverTimestamp() }, { merge: true });
  } catch (err) {
    // Analytics document is optional - blog post creation should succeed even if analytics fails
    console.warn('Failed to create analytics document:', err);
  }
  try {
    await setDoc(
      doc(db, 'blogReactions', docRef.id),
      { likes: 0, dislikes: 0, shares: 0, updatedAt: serverTimestamp() },
      { merge: true }
    );
  } catch (err) {
    // Reactions document is optional - blog post creation should succeed even if it fails
    console.warn('Failed to create blog reactions document:', err);
  }
  return docRef.id;
};

export const updateBlogPost = async (id: string, post: Partial<BlogPost>): Promise<void> => {
  const postRef = doc(db, 'blogPosts', id);
  const patch: Partial<BlogPost> = { ...post };
  if (!patch.slug && patch.title) {
    try {
      patch.slug = await ensureUniqueSlug(slugify(patch.title), id);
    } catch (err) {
      console.warn('Failed to assign blog post slug:', err);
    }
  }
  await updateDoc(postRef, stripUndefined(patch) as DocumentData);
};

export const deleteBlogPost = async (id: string): Promise<void> => {
  const postRef = doc(db, 'blogPosts', id);
  let citedUrls: string[] = [];
  try {
    const postSnap = await getDoc(postRef);
    if (postSnap.exists()) {
      const data = postSnap.data() as Partial<BlogPost>;
      if (Array.isArray(data.sources)) {
        citedUrls = data.sources.map((s) => s.url).filter((u): u is string => Boolean(u));
      }
    }
  } catch (err) {
    console.warn('Failed to read blog post before delete:', err);
  }
  await deleteDoc(postRef);
  // Release the post's cited URLs so the agent can use them again.
  if (citedUrls.length > 0) {
    try {
      await removeUsedNewsUrls(citedUrls);
    } catch (err) {
      console.warn('Failed to release blog post cited URLs:', err);
    }
  }
};

export const subscribeToBlogPosts = (
  callback: (posts: BlogPost[]) => void,
  options?: { includeUnpublished?: boolean }
) => {
  const postsRef = collection(db, 'blogPosts');
  // If includeUnpublished is true (admin), query without the published filter.
  // Otherwise, restrict to published == true so public listeners don't request
  // forbidden documents and trigger permission-denied errors.
  const q = options && options.includeUnpublished
    ? query(postsRef, orderBy('date', 'desc'))
    : query(postsRef, where('published', '==', true), orderBy('date', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const posts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BlogPost));
    callback(posts);
  }, (error) => {
    console.error('Firestore subscription failed:', error);
    callback([]);
  });
};

export const getBlogReadsCounts = async (ids: string[]): Promise<Record<string, number>> => {
  const counts: Record<string, number> = {};
  await Promise.all(ids.map(async (id) => {
    const d = await getDoc(doc(db, 'analyticsBlogs', id));
    const data: DocumentData | undefined = d.exists() ? d.data() : undefined;
    counts[id] = data?.reads ?? 0;
  }));
  return counts;
};

/** Live blog read counts for the given ids. Returns an unsubscribe function. */
export const subscribeBlogReads = (
  ids: string[],
  cb: (counts: Record<string, number>) => void,
): (() => void) => {
  const counts: Record<string, number> = {};
  if (!ids.length) {
    cb({});
    return () => {};
  }
  const unsubs = ids.map((id) =>
    onSnapshot(
      doc(db, 'analyticsBlogs', id),
      (snap) => {
        const data = snap.data();
        counts[id] = typeof data?.reads === 'number' ? data.reads : 0;
        cb({ ...counts });
      },
      () => { /* ignore permission/network errors — keep last known counts */ },
    ),
  );
  return () => unsubs.forEach((unsub) => unsub());
};
