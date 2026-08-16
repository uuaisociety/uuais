import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase-admin';

const SEEN_DOC = 'blog_news_seen';

/** Normalise a URL so the same story from different sources dedupes. */
export function normalizeSeenUrl(raw: string): string {
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

async function readUrls(): Promise<string[]> {
  const snapshot = await adminDb.collection('config').doc(SEEN_DOC).get();
  const urls = snapshot.exists ? snapshot.data()?.urls : undefined;
  return Array.isArray(urls) ? urls.filter((u: unknown): u is string => typeof u === 'string') : [];
}

/** URLs the admin has marked as used/read so the agent skips them when researching candidates. */
export async function getSeenNewsUrls(): Promise<string[]> {
  try {
    return await readUrls();
  } catch (e) {
    console.warn('Failed to load seen news URLs:', e);
    return [];
  }
}

/** Mark URLs as used so the agent skips them (deduped by normalized URL). */
export async function addSeenNewsUrls(urls: string[]): Promise<void> {
  const clean = urls
    .filter((u): u is string => typeof u === 'string' && u.trim().length > 0)
    .map((u) => u.trim());
  if (clean.length === 0) return;
  try {
    const current = await readUrls();
    const keys = new Set(current.map(normalizeSeenUrl));
    const next = [...current];
    for (const url of clean) {
      const key = normalizeSeenUrl(url);
      if (!keys.has(key)) {
        keys.add(key);
        next.push(url);
      }
    }
    if (next.length !== current.length) {
      await adminDb
        .collection('config')
        .doc(SEEN_DOC)
        .set({ urls: next, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    }
  } catch (e) {
    console.warn('Failed to add seen news URLs:', e);
  }
}

/** Un-mark URLs so the agent may cover them again. */
export async function removeSeenNewsUrls(urls: string[]): Promise<void> {
  if (urls.length === 0) return;
  try {
    const current = await readUrls();
    const keys = new Set(urls.map(normalizeSeenUrl));
    const next = current.filter((u) => !keys.has(normalizeSeenUrl(u)));
    if (next.length !== current.length) {
      await adminDb
        .collection('config')
        .doc(SEEN_DOC)
        .set({ urls: next, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    }
  } catch (e) {
    console.warn('Failed to remove seen news URLs:', e);
  }
}
