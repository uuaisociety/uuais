import { doc, getDoc, setDoc, serverTimestamp, increment, onSnapshot, DocumentData } from 'firebase/firestore';
import { db } from '@/lib/firebase-client';

// First-party aggregate metrics (reads/clicks). No personal data, no user
// identity, no cookies — only per-device localStorage dedup and a Firestore
// counter per content ID. Counted for all visitors (legitimate interest);
// third-party analytics (e.g. Vercel) remain consent-gated separately.

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

function subscribeCounter(
  collectionName: 'analyticsEvents' | 'analyticsJobs',
  ids: string[],
  cb: (counts: Record<string, number>) => void,
): () => void {
  const counts: Record<string, number> = {};
  if (!ids.length) {
    cb({});
    return () => {};
  }
  const unsubs = ids.map((id) =>
    onSnapshot(
      doc(db, collectionName, id),
      (snap) => {
        const data = snap.data();
        counts[id] = typeof data?.clicks === 'number' ? data.clicks : 0;
        cb({ ...counts });
      },
      () => { /* ignore permission/network errors — keep last known counts */ },
    ),
  );
  return () => unsubs.forEach((unsub) => unsub());
}

export const subscribeEventClicks = (
  ids: string[],
  cb: (counts: Record<string, number>) => void,
): (() => void) => subscribeCounter('analyticsEvents', ids, cb);

export const subscribeJobClicks = (
  ids: string[],
  cb: (counts: Record<string, number>) => void,
): (() => void) => subscribeCounter('analyticsJobs', ids, cb);

export async function incrementJobClick(jobId: string): Promise<void> {
  if (typeof window === 'undefined') return;
  const key = `clicked_job_${jobId}`;
  try {
    if (window?.localStorage?.getItem(key) === '1') return;
    window?.localStorage?.setItem(key, '1');
  } catch {
    return;
  }
  const ref = doc(db, 'analyticsJobs', jobId);
  await setDoc(ref, { clicks: increment(1), updatedAt: serverTimestamp() }, { merge: true });
}

export const getJobClicksCounts = async (ids: string[]): Promise<Record<string, number>> => {
  const counts: Record<string, number> = {};
  await Promise.all(ids.map(async (id) => {
    const d = await getDoc(doc(db, 'analyticsJobs', id));
    const data: DocumentData | undefined = d.exists() ? d.data() : undefined;
    counts[id] = data?.clicks ?? 0;
  }));
  return counts;
};

export async function incrementExternalRegistrationClick(eventId: string): Promise<void> {
  if (typeof window === 'undefined') return;
  const key = `external_reg_${eventId}`;
  try {
    if (window?.localStorage?.getItem(key) === '1') return;
    window?.localStorage?.setItem(key, '1');
  } catch {
    return;
  }
  const ref = doc(db, 'analyticsEvents', eventId);
  await setDoc(ref, { externalRegistrationClicks: increment(1), updatedAt: serverTimestamp() }, { merge: true });
}

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
