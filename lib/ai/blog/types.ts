/** Kinds of articles the AI News Desk can produce. */
export type BlogPostType = 'weekly-digest' | 'event-preview' | 'event-recap';

/** A candidate news story surfaced by RSS/Exa for the admin to select from. */
export interface NewsItem {
  id: string;
  title: string;
  url: string;
  source: string;
  publishedAt?: string;
  snippet: string;
}

/** A curated news source. `rss` parses an RSS/Atom feed; `scrape` falls back to
 *  extracting article links from the page HTML (for sources without feeds). */
export interface BlogFeed {
  name: string;
  type: 'rss' | 'scrape';
  url: string;
  /** For `scrape` feeds: only anchor hrefs starting with this prefix are kept (e.g. `/news/`). */
  hrefPrefix?: string;
}

/** Config for the AI News Desk (stored in `config/blog_ai_settings`). */
export interface BlogAISettings {
  systemPrompt: string;
  model: string;
  feeds: BlogFeed[];
  exaQuery: string;
  /** Editorial memory: watch items, reader feedback, and standing preferences injected into every generation. */
  editorialNotes: string;
  /** Maximum output tokens per generation. Raise this if reasoning models run out of budget before emitting the JSON. */
  maxOutputTokens: number;
  updatedAt: string | null;
  updatedBy: string | null;
}

/** Structured output the model must return when generating a draft. */
export interface GeneratedBlogResult {
  title: string;
  excerpt: string;
  contentHtml: string;
  tags: string[];
  sources: { title: string; url: string }[];
  /** Absolute hero image URL from the source material, or empty when none is available. */
  image?: string;
}

export interface NewsFetchResult {
  candidates: NewsItem[];
  /** Which sources contributed (for UI display + debugging). */
  sources: {
    feeds: string[];
    exa: boolean;
  };
  warnings: string[];
}
