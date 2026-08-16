import { doc, getDoc, setDoc, getDocs, collection, query, where, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase-client';

const SEEN_DOC = 'blog_news_seen';

const seenRef = () => doc(db, 'config', SEEN_DOC);

/** Normalise a URL for deduping against the covered set. */
function normalizeUrl(raw: string): string {
  try {
    const url = new URL(raw);
    url.hash = '';
    for (const key of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content']) {
      url.searchParams.delete(key);
    }
    return `${url.hostname.toLowerCase()}${url.pathname.replace(/\/+$/, '') || '/'}`;
  } catch {
    return raw.trim().toLowerCase().replace(/\/+$/, '');
  }
}

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

/**
 * Every URL the agent currently skips: the admin-marked used store plus URLs
 * cited by existing AI posts (so superadmins can see and toggle them all).
 */
export const getCoveredNewsUrls = async (): Promise<CoveredNewsUrl[]> => {
  const [seen, postsSnap] = await Promise.all([
    getUsedNewsUrls(),
    getDocs(query(collection(db, 'blogPosts'), where('authorType', '==', 'ai'))),
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
