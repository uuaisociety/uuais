import { collection, query, orderBy, where, getDocs, addDoc, updateDoc, deleteDoc, doc, getDoc, setDoc, serverTimestamp, DocumentData, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase-client';
import { BlogPost } from '@/types';
import { stripUndefined } from './utils';

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
    const analyticsRef = doc(db, 'analyticsBlogs', docRef.id);
    await setDoc(analyticsRef, { reads: 0, updatedAt: serverTimestamp() }, { merge: true });
  } catch (err) {
    // Analytics document is optional - blog post creation should succeed even if analytics fails
    console.warn('Failed to create analytics document:', err);
  }
  return docRef.id;
};

export const updateBlogPost = async (id: string, post: Partial<BlogPost>): Promise<void> => {
  const postRef = doc(db, 'blogPosts', id);
  await updateDoc(postRef, stripUndefined(post) as DocumentData);
};

export const deleteBlogPost = async (id: string): Promise<void> => {
  const postRef = doc(db, 'blogPosts', id);
  await deleteDoc(postRef);
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
