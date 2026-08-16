import { doc, getDoc, setDoc, getDocs, collection, query, where, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase-client';
import { normalizeNewsUrl as normalizeUrl } from '@/lib/ai/blog/url';
import { SEEN_DOC } from '@/lib/ai/blog/defaults';

const seenRef = () => doc(db, 'config', SEEN_DOC);

export const getUsedNewsUrls = async (): Promise<string[]> => {
  const snapshot = await getDoc(seenRef());
  const urls = snapshot.exists() ? snapshot.data()?.urls : undefined;
  return Array.isArray(urls) ? urls.filter((u: unknown): u is string => typeof u === 'string') : [];
};

const writeSeen = async (urls: string[]): Promise<void> => {
  await setDoc(seenRef(), { urls, updatedAt: serverTimestamp() }, { merge: true });
};

/** Mark a news URL as used so the agent skips it. Returns the new list. */
export const addUsedNewsUrl = async (url: string): Promise<string[]> => {
  const clean = url.trim();
  if (!clean) return getUsedNewsUrls();
  const current = await getUsedNewsUrls();
  const key = normalizeUrl(clean);
  if (current.some((u) => normalizeUrl(u) === key)) return current;
  const next = [...current, clean];
  await writeSeen(next);
  return next;
};

/** Bulk mark (used when a post is published — its cited URLs become covered). Returns the new list. */
export const addUsedNewsUrls = async (urls: string[]): Promise<string[]> => {
  const clean = urls.filter((u): u is string => typeof u === 'string' && u.trim().length > 0).map((u) => u.trim());
  if (clean.length === 0) return getUsedNewsUrls();
  const current = await getUsedNewsUrls();
  const keys = new Set(current.map(normalizeUrl));
  const next = [...current];
  for (const url of clean) {
    if (!keys.has(normalizeUrl(url))) {
      keys.add(normalizeUrl(url));
      next.push(url);
    }
  }
  if (next.length === current.length) return current;
  await writeSeen(next);
  return next;
};

/** Un-mark a news URL so the agent may cover it again. Returns the new list. */
export const removeUsedNewsUrl = async (url: string): Promise<string[]> => {
  const current = await getUsedNewsUrls();
  const key = normalizeUrl(url);
  const next = current.filter((u) => normalizeUrl(u) !== key);
  if (next.length === current.length) return current;
  await writeSeen(next);
  return next;
};

/** Bulk un-mark (used when a post is deleted — its cited URLs become available again). */
export const removeUsedNewsUrls = async (urls: string[]): Promise<string[]> => {
  if (urls.length === 0) return getUsedNewsUrls();
  const current = await getUsedNewsUrls();
  const keys = new Set(urls.map(normalizeUrl));
  const next = current.filter((u) => !keys.has(normalizeUrl(u)));
  if (next.length === current.length) return current;
  await writeSeen(next);
  return next;
};

export interface CoveredNewsUrl {
  url: string;
  /** In the admin "used" store (agent skips it). */
  used: boolean;
  /** Titles of live AI posts that cite this URL. */
  citedBy: string[];
}

/** Every URL the agent currently skips: the admin-marked used store plus URLs cited by PUBLISHED AI posts (drafts excluded). */
export const getCoveredNewsUrls = async (): Promise<CoveredNewsUrl[]> => {
  const [seen, postsSnap] = await Promise.all([
    getUsedNewsUrls(),
    getDocs(query(collection(db, 'blogPosts'), where('authorType', '==', 'ai'), where('published', '==', true))),
  ]);

  const map = new Map<string, CoveredNewsUrl>();
  const upsert = (key: string, patch: Partial<CoveredNewsUrl>) => {
    const existing = map.get(key) ?? { url: '', used: false, citedBy: [] as string[] };
    map.set(key, { ...existing, ...patch });
  };

  for (const url of seen) {
    if (!url.trim()) continue;
    const key = normalizeUrl(url);
    upsert(key, { url, used: true });
  }

  postsSnap.forEach((docSnap) => {
    const data = docSnap.data();
    const title = typeof data?.title === 'string' ? data.title : 'Untitled post';
    const sources = data?.sources;
    if (!Array.isArray(sources)) return;
    for (const s of sources) {
      if (!s || typeof s.url !== 'string' || !s.url.trim()) continue;
      const key = normalizeUrl(s.url);
      const existing = map.get(key) ?? { url: s.url, used: false, citedBy: [] as string[] };
      if (!existing.citedBy.includes(title)) existing.citedBy.push(title);
      map.set(key, existing);
    }
  });

  return Array.from(map.values());
};
