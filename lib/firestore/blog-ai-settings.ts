import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase-client';
import { DEFAULT_BLOG_AI_SETTINGS } from '@/lib/ai/blog/defaults';
import type { BlogAISettings, BlogFeed } from '@/lib/ai/blog/types';

const BLOG_SETTINGS_DOC_ID = 'blog_ai_settings';

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

export const getBlogAISettings = async (): Promise<BlogAISettings> => {
  const settingsRef = doc(db, 'config', BLOG_SETTINGS_DOC_ID);
  const settingsSnap = await getDoc(settingsRef);

  if (!settingsSnap.exists()) {
    return DEFAULT_BLOG_AI_SETTINGS;
  }

  const data = settingsSnap.data();
  return {
    systemPrompt: typeof data.systemPrompt === 'string' ? data.systemPrompt : DEFAULT_BLOG_AI_SETTINGS.systemPrompt,
    model: typeof data.model === 'string' ? data.model : DEFAULT_BLOG_AI_SETTINGS.model,
    feeds: normalizeFeeds(data.feeds),
    exaQuery: typeof data.exaQuery === 'string' ? data.exaQuery : DEFAULT_BLOG_AI_SETTINGS.exaQuery,
    editorialNotes: typeof data.editorialNotes === 'string' ? data.editorialNotes : DEFAULT_BLOG_AI_SETTINGS.editorialNotes,
    maxOutputTokens: typeof data.maxOutputTokens === 'number' && Number.isFinite(data.maxOutputTokens) ? data.maxOutputTokens : DEFAULT_BLOG_AI_SETTINGS.maxOutputTokens,
    updatedAt: data.updatedAt?.toDate?.() ? data.updatedAt.toDate().toISOString() : data.updatedAt ?? null,
    updatedBy: data.updatedBy ?? null,
  };
};

export const updateBlogAISettings = async (
  settings: Omit<BlogAISettings, 'updatedAt' | 'updatedBy'>,
  updatedBy: string
): Promise<void> => {
  const settingsRef = doc(db, 'config', BLOG_SETTINGS_DOC_ID);
  await setDoc(
    settingsRef,
    {
      ...settings,
      updatedAt: serverTimestamp(),
      updatedBy,
    },
    { merge: true }
  );
};
