import { adminDb } from '@/lib/firebase-admin';
import { SEEN_DOC } from './defaults';

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
