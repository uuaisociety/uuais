import { adminDb } from '@/lib/firebase-admin';
import { DEFAULT_BLOG_AI_SETTINGS } from './defaults';
import type { BlogAISettings, BlogFeed } from './types';

let cached: BlogAISettings | null = null;
let lastFetch = 0;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

function normalizeFeeds(feeds: unknown): BlogFeed[] {
  if (!Array.isArray(feeds)) return DEFAULT_BLOG_AI_SETTINGS.feeds;
  const out: BlogFeed[] = [];
  for (const f of feeds) {
    if (!f || typeof f !== 'object') continue;
    const name = String((f as { name?: unknown }).name ?? '').trim().slice(0, 80);
    const url = String((f as { url?: unknown }).url ?? '').trim();
    const type = (f as { type?: unknown }).type === 'scrape' ? 'scrape' : 'rss';
    const hrefPrefix = type === 'scrape' ? String((f as { hrefPrefix?: unknown }).hrefPrefix ?? '').trim() : undefined;
    if (!name || !url) continue;
    if (type === 'scrape' && !hrefPrefix) continue;
    out.push({ name, type, url, hrefPrefix });
  }
  return out.length > 0 ? out : DEFAULT_BLOG_AI_SETTINGS.feeds;
}

export async function getBlogAISettings(): Promise<BlogAISettings> {
  const now = Date.now();
  if (cached && now - lastFetch < CACHE_TTL) {
    return cached;
  }
  try {
    const settingsDoc = await adminDb.collection('config').doc('blog_ai_settings').get();
    if (settingsDoc.exists) {
      const data = settingsDoc.data();
      cached = {
        systemPrompt: typeof data?.systemPrompt === 'string' ? data.systemPrompt : DEFAULT_BLOG_AI_SETTINGS.systemPrompt,
        model: typeof data?.model === 'string' ? data.model : DEFAULT_BLOG_AI_SETTINGS.model,
        feeds: normalizeFeeds(data?.feeds),
        exaQuery: typeof data?.exaQuery === 'string' ? data.exaQuery : DEFAULT_BLOG_AI_SETTINGS.exaQuery,
        editorialNotes: typeof data?.editorialNotes === 'string' ? data.editorialNotes : DEFAULT_BLOG_AI_SETTINGS.editorialNotes,
        maxOutputTokens: typeof data?.maxOutputTokens === 'number' && Number.isFinite(data.maxOutputTokens) ? data.maxOutputTokens : DEFAULT_BLOG_AI_SETTINGS.maxOutputTokens,
        updatedAt: data?.updatedAt?.toDate?.() ? data.updatedAt.toDate().toISOString() : data?.updatedAt ?? null,
        updatedBy: data?.updatedBy ?? null,
      };
      lastFetch = now;
      return cached;
    }
  } catch (e) {
    console.warn('Failed to load blog AI settings from Firestore, using defaults:', e);
  }
  return DEFAULT_BLOG_AI_SETTINGS;
}
