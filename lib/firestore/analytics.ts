import { doc, getDoc, setDoc, serverTimestamp, increment, DocumentData } from 'firebase/firestore';
import { db } from '@/lib/firebase-client';

export async function incrementEventUniqueClick(eventId: string): Promise<void> {
  if (typeof window === 'undefined') return;
  const key = `clicked_event_${eventId}`;
  try {
    if (window?.localStorage?.getItem(key) === '1') return;
    window?.localStorage?.setItem(key, '1');
  } catch {
    // In sandboxed contexts (origin null, no allow-same-origin), localStorage is inaccessible.
    // To avoid overcounting and runtime errors, skip increment when we cannot dedupe.
    return;
  }
  const ref = doc(db, 'analyticsEvents', eventId);
  await setDoc(ref, { clicks: increment(1), updatedAt: serverTimestamp() }, { merge: true });
}

export const getEventClicksCounts = async (ids: string[]): Promise<Record<string, number>> => {
  const counts: Record<string, number> = {};
  await Promise.all(ids.map(async (id) => {
    const d = await getDoc(doc(db, 'analyticsEvents', id));
    const data: DocumentData | undefined = d.exists() ? d.data() : undefined;
    counts[id] = data?.clicks ?? 0;
  }));
  return counts;
};

export async function incrementBlogRead(blogId: string): Promise<void> {
  if (typeof window === 'undefined') return;
  const key = `read_blog_${blogId}`;
  try {
    if (window?.localStorage?.getItem(key) === '1') return;
    window?.localStorage?.setItem(key, '1');
  } catch {
    // Skip increment in sandboxed contexts to avoid client exception and overcounting.
    return;
  }
  const ref = doc(db, 'analyticsBlogs', blogId);
  await setDoc(ref, { reads: increment(1), updatedAt: serverTimestamp() }, { merge: true });
}
