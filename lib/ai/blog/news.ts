import { XMLParser } from 'fast-xml-parser';
import { adminDb } from '@/lib/firebase-admin';
import { getBlogAISettings } from './settings';
import { getSeenNewsUrls } from './seen';
import type { BlogFeed, NewsFetchResult, NewsItem } from './types';

const EXA_SEARCH_URL = 'https://api.exa.ai/search';
const DEFAULT_PER_FEED_LIMIT = 6;
const DEFAULT_MAX_CANDIDATES = 30;

/** Fetch with a hard timeout so a slow upstream feed never hangs the route. */
async function fetchWithTimeout(url: string, init?: RequestInit, timeoutMs = 8000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function stripHtml(input: string): string {
  return input
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function clampSnippet(text: string, maxChars = 220): string {
  const clean = stripHtml(text);
  if (clean.length <= maxChars) return clean;
  return `${clean.slice(0, maxChars - 1).trim()}…`;
}

/** Normalise a URL so the same story surfacing from different sources dedupes. */
export function normalizeNewsUrl(rawUrl: string): string {
  try {
    const url = new URL(rawUrl);
    url.hash = '';
    for (const key of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content']) {
      url.searchParams.delete(key);
    }
    const path = url.pathname.replace(/\/+$/, '') || '/';
    return `${url.hostname.toLowerCase()}${path.toLowerCase()}`;
  } catch {
    return rawUrl.trim().toLowerCase().replace(/\/+$/, '');
  }
}

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function toStr(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && '#text' in value) {
    return String((value as { '#text': unknown })['#text'] ?? '');
  }
  return '';
}

// -----------------------------------------
// RSS / Atom
// -----------------------------------------

interface RssItem {
  title?: unknown;
  link?: unknown;
  pubDate?: unknown;
  published?: unknown;
  updated?: unknown;
  'dc:date'?: unknown;
  description?: unknown;
  summary?: unknown;
  content?: unknown;
}

/** Extract the href from an Atom <link> (single element or array of elements with attributes). */
function atomHref(link: unknown): string {
  if (typeof link === 'string') return link;
  if (Array.isArray(link)) {
    for (const l of link) {
      if (l && typeof l === 'object' && '@_href' in l) return String((l as { '@_href': unknown })['@_href']);
    }
    return '';
  }
  if (link && typeof link === 'object' && '@_href' in link) {
    return String((link as { '@_href': unknown })['@_href']);
  }
  return '';
}

function parseRssFeed(xml: string): RssItem[] {
  // Keep attributes so Atom <link href="..."/> resolves.
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });
  const doc = parser.parse(xml) as {
    rss?: { channel?: { item?: RssItem[] | RssItem } };
    feed?: { entry?: RssItem[] | RssItem };
  };
  const channelItem = doc?.rss?.channel?.item;
  if (Array.isArray(channelItem)) return channelItem;
  if (channelItem) return [channelItem];
  const feedEntry = doc?.feed?.entry;
  if (Array.isArray(feedEntry)) return feedEntry;
  if (feedEntry) return [feedEntry];
  return [];
}

async function fetchRssFeed(feed: BlogFeed, limit: number): Promise<NewsItem[]> {
  const res = await fetchWithTimeout(feed.url);
  if (!res.ok) {
    throw new Error(`Feed ${feed.name} returned ${res.status}`);
  }
  const xml = await res.text();
  const items = parseRssFeed(xml);
  const hostname = hostnameOf(feed.url);
  return items
    .slice(0, limit)
    .map((item, index): NewsItem | null => {
      const title = toStr(item.title).trim();
      // RSS uses <link>text</link>; Atom uses <link href="..."/>.
      const link = toStr(item.link).trim() || atomHref(item.link);
      if (!title || !link) return null;
      const publishedAt = toStr(item.pubDate) || toStr(item.published) || toStr(item.updated) || toStr(item['dc:date']) || undefined;
      const snippet = clampSnippet(toStr(item.description) || toStr(item.summary) || toStr(item.content));
      return {
        id: `${hostname}-${index}`,
        title,
        url: link,
        source: feed.name || hostname,
        publishedAt,
        snippet,
      };
    })
    .filter((item): item is NewsItem => item !== null);
}

// -----------------------------------------
// HTML scraping fallback (feeds without RSS)
// -----------------------------------------

interface ScrapeAnchor {
  href: string;
  text: string;
}

function extractAnchors(html: string, hrefPrefix: string): ScrapeAnchor[] {
  const out: ScrapeAnchor[] = [];
  const anchorRe = /<a\b[^>]*href\s*=\s*"([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;
  while ((match = anchorRe.exec(html)) !== null) {
    const href = (match[1] || '').trim();
    const text = stripHtml(match[2] || '').trim();
    if (!href || !text) continue;
    if (href.startsWith(hrefPrefix)) {
      out.push({ href, text });
    }
  }
  return out;
}

async function scrapePage(feed: BlogFeed, limit: number): Promise<NewsItem[]> {
  if (!feed.hrefPrefix) {
    throw new Error(`Scrape feed ${feed.name} is missing a hrefPrefix`);
  }
  const res = await fetchWithTimeout(feed.url);
  if (!res.ok) {
    throw new Error(`Scrape ${feed.name} returned ${res.status}`);
  }
  const html = await res.text();
  const base = new URL(feed.url);
  const items = extractAnchors(html, feed.hrefPrefix)
    .map((anchor) => ({
      ...anchor,
      url: new URL(anchor.href, base).toString(),
    }))
    .filter((a) => {
      try {
        new URL(a.url);
        return true;
      } catch {
        return false;
      }
    });

  // Dedupe by URL, keep the longest anchor text (most descriptive title).
  const seen = new Set<string>();
  const unique: { url: string; text: string }[] = [];
  for (const a of items) {
    const key = normalizeNewsUrl(a.url);
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push({ url: a.url, text: a.text });
  }

  return unique.slice(0, limit).map((a, index) => ({
    id: `${feed.name}-${index}`,
    title: a.text.slice(0, 300) || hostnameOf(a.url),
    url: a.url,
    source: feed.name,
    publishedAt: undefined,
    snippet: '',
  }));
}

// -----------------------------------------
// Exa search
// -----------------------------------------

interface ExaResult {
  url?: string;
  title?: string;
  publishedDate?: string;
  author?: string;
  text?: string;
}

async function searchExa(query: string, numResults: number): Promise<NewsItem[]> {
  const apiKey = process.env.EXA_API_KEY;
  if (!apiKey) {
    throw new Error('EXA_API_KEY is not configured');
  }
  const payload = {
    query,
    numResults,
    category: 'news',
    contents: { text: { maxCharacters: 300 } },
  };
  const res = await fetchWithTimeout(
    EXA_SEARCH_URL,
    {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    },
    10000
  );
  if (!res.ok) {
    throw new Error(`Exa search returned ${res.status}`);
  }
  const json = (await res.json()) as { results?: ExaResult[] };
  const results = Array.isArray(json?.results) ? json.results : [];
  return results.map((result, index): NewsItem | null => {
    const url = (result.url || '').trim();
    const title = (result.title || '').trim();
    if (!url || !title) return null;
    const hostname = hostnameOf(url);
    return {
      id: `exa-${index}`,
      title,
      url,
      source: result.author || hostname,
      publishedAt: result.publishedDate || undefined,
      snippet: clampSnippet(result.text || ''),
    };
  }).filter((item): item is NewsItem => item !== null);
}

// -----------------------------------------
// Combined pipeline
// -----------------------------------------

/** Load URLs the agent should skip: admin-marked "used" URLs plus URLs already
 *  cited by past AI posts. */
async function getPreviouslyCoveredUrls(): Promise<Set<string>> {
  const covered = new Set<string>();
  try {
    const seenUrls = await getSeenNewsUrls();
    for (const url of seenUrls) {
      if (typeof url === 'string' && url.trim()) covered.add(normalizeNewsUrl(url));
    }
    const snapshot = await adminDb.collection('blogPosts').where('authorType', '==', 'ai').get();
    snapshot.forEach((docSnap) => {
      const sources = docSnap.data()?.sources;
      if (Array.isArray(sources)) {
        for (const s of sources) {
          if (s && typeof s.url === 'string') covered.add(normalizeNewsUrl(s.url));
        }
      }
    });
  } catch (e) {
    console.warn('Failed to load previously covered news URLs:', e);
  }
  return covered;
}

export async function fetchNewsCandidates(options?: {
  query?: string;
  limit?: number;
}): Promise<NewsFetchResult> {
  const settings = await getBlogAISettings();
  const maxCandidates = Math.max(5, Math.min(options?.limit ?? DEFAULT_MAX_CANDIDATES, 50));

  const feedResults = await Promise.allSettled(
    settings.feeds.map((feed) =>
      feed.type === 'scrape' ? scrapePage(feed, DEFAULT_PER_FEED_LIMIT) : fetchRssFeed(feed, DEFAULT_PER_FEED_LIMIT)
    )
  );
  const items: NewsItem[] = [];
  const sourceNames: string[] = [];
  const warnings: string[] = [];
  feedResults.forEach((result, index) => {
    const feed = settings.feeds[index];
    if (result.status === 'fulfilled') {
      items.push(...result.value);
      if (result.value.length > 0) sourceNames.push(feed.name);
    } else {
      warnings.push(`${feed.type === 'rss' ? 'RSS feed' : 'Scrape source'} ${feed.name} failed: ${result.reason instanceof Error ? result.reason.message : 'unknown error'}`);
    }
  });

  let exaItems: NewsItem[] = [];
  if (process.env.EXA_API_KEY) {
    try {
      exaItems = await searchExa(options?.query?.trim() || settings.exaQuery, 10);
    } catch (e) {
      warnings.push(`Exa search failed: ${e instanceof Error ? e.message : 'unknown error'}`);
    }
  } else {
    warnings.push('EXA_API_KEY is not set — news candidates from curated feeds only');
  }

  const covered = await getPreviouslyCoveredUrls();

  // Dedupe by normalized URL, keep the richest snippet, drop previously-covered stories.
  const byUrl = new Map<string, NewsItem>();
  for (const item of [...items, ...exaItems]) {
    const key = normalizeNewsUrl(item.url);
    if (covered.has(key)) continue;
    const existing = byUrl.get(key);
    if (!existing || item.snippet.length > existing.snippet.length) {
      byUrl.set(key, item);
    }
  }

  const candidates = Array.from(byUrl.values())
    .sort((a, b) => {
      const ta = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
      const tb = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
      if (Number.isNaN(ta) && Number.isNaN(tb)) return 0;
      if (Number.isNaN(ta)) return 1;
      if (Number.isNaN(tb)) return -1;
      return tb - ta;
    })
    .slice(0, maxCandidates);

  return {
    candidates,
    sources: { feeds: sourceNames, exa: Boolean(process.env.EXA_API_KEY) },
    warnings,
  };
}
