import type { BlogAISettings, BlogFeed, BlogPostType } from './types';

/** Firestore document id for the "used articles" store (shared by server + client). */
export const SEEN_DOC = 'blog_news_seen';

/** Candidate pool and context limits used by generation + news discovery. */
export const MAX_EVENTS_IN_CONTEXT = 3;
export const DEFAULT_PER_FEED_LIMIT = 6;
export const DEFAULT_MAX_CANDIDATES = 30;
export const MAX_CANDIDATES_FOR_AUTO = 40;
export const VALID_TYPES: BlogPostType[] = ['weekly-digest', 'event-preview', 'event-recap'];

/** Exa news search endpoint. */
export const EXA_SEARCH_URL = 'https://api.exa.ai/search';

/** Hosts next/image is configured to serve (next.config.ts `images.remotePatterns`). */
export const ALLOWED_IMAGE_HOSTS = ['firebasestorage.googleapis.com', 'drive.google.com', 'storage.googleapis.com'];

/** Cap on the reasoning trace persisted with a draft and forwarded to the admin console. */
export const MAX_REASONING_TRACE = 20000;

/** Vercel `maxDuration` (seconds) for blog generation routes. */
export const BLOG_GENERATION_MAX_DURATION = 300;

export const AI_DESK_AUTHOR = 'UU AI Society AI Desk';

/** Default hero image for AI News Desk posts when the model can't supply one. */
export const DEFAULT_BLOG_IMAGE = '/images/campus.png';

/** Curated AI news sources (`rss` parses feeds; `scrape` pulls article links from page HTML for outlets without feeds). */
export const DEFAULT_BLOG_FEEDS: BlogFeed[] = [
  { name: 'OpenAI News', type: 'rss', url: 'https://openai.com/news/rss.xml' },
  { name: 'Google DeepMind', type: 'rss', url: 'https://deepmind.google/blog/rss.xml' },
  { name: 'Google AI Blog', type: 'rss', url: 'https://blog.google/technology/ai/rss/' },
  { name: 'Anthropic News', type: 'scrape', url: 'https://www.anthropic.com/news', hrefPrefix: '/news/' },
  { name: 'Hugging Face Blog', type: 'rss', url: 'https://huggingface.co/blog/feed.xml' },
  { name: 'MIT Technology Review AI', type: 'rss', url: 'https://www.technologyreview.com/topic/artificial-intelligence/feed' },
  { name: 'The Verge AI', type: 'rss', url: 'https://www.theverge.com/rss/ai-artificial-intelligence/index.xml' },
  { name: 'TechCrunch AI', type: 'rss', url: 'https://techcrunch.com/category/artificial-intelligence/feed/' },
  { name: 'Ars Technica AI', type: 'rss', url: 'https://arstechnica.com/ai/feed/' },
  { name: 'VentureBeat AI', type: 'rss', url: 'https://venturebeat.com/category/ai/feed/' },
  { name: 'arXiv cs.AI', type: 'rss', url: 'https://rss.arxiv.org/rss/cs.AI' },
  { name: 'Simon Willison', type: 'rss', url: 'https://simonwillison.net/atom/everything/' },
  { name: 'The Decoder', type: 'rss', url: 'https://the-decoder.com/feed/' },
  { name: 'DeepSeek News', type: 'scrape', url: 'https://www.deepseek.com/news', hrefPrefix: '/news/' },
  { name: 'Z.ai releases', type: 'scrape', url: 'https://huggingface.co/zai-org', hrefPrefix: '/zai-org/' },
  { name: 'Breakit (Svensk tech)', type: 'rss', url: 'https://www.breakit.se/feed/artiklar' },
  { name: 'Di Digital', type: 'rss', url: 'https://www.di.se/rss' },
];

export const DEFAULT_BLOG_SYSTEM_PROMPT = `You are the editor-in-chief of the UU AI Society "AI News Desk", a student-run publication for Uppsala University.

You produce the weekly AI news digest: a concise, accurate, genuinely useful round-up of the most significant developments, written for university students.

Editorial rules:
- Pick the MOST significant stories, not the most numerous. Model releases and lab announcements first, then research, then industry/policy news. Skip minor releases, re-posts, and duplicate coverage of the same story across sources — choose the best single source per story.
- Tone: smart, friendly, concrete. No hype, no doom-scrolling, no clickbait. Do not include commentary, predictions, or your own opinions — report what happened and why it matters in one or two sentences.
- Write for students: connect news to careers, studies, and student life. If a story is about an AI-lab internship or student program (application windows, deadlines, cohorts), include it.
- Swedish tech & AI startup news (funding rounds, launches, people moves) is a category of its own — include notable Swedish stories.
- Be strictly factual: only make claims supported by the provided source material. Never invent quotes, numbers, or details.
- Whenever you mention a story, link it to its provided URL (anchor text is the story title).
- The article body must be 400-700 words of valid HTML (<h2>/<h3> for sections, <p>, <ul>/<li>, <a href="...">). Do NOT wrap in <html>/<body>.
- Only include a "From the UU AI Society" call-to-action if the provided events are relevant and it adds value; otherwise end the article cleanly and do not mention UU AI Society at all.
- Return your response as valid JSON only.`;

export const DEFAULT_EDITORIAL_NOTES = `Watch items (prioritize when they hit):
- (list specific releases or stories to watch for here)

Reader feedback (what landed well — keep doing):
- Model releases with benchmark tables and local-deployment angles.
- Event recaps and previews.
- AI-lab internships and student programs.`;

/** Task instructions for a weekly digest generated in auto-pick mode (agent selects stories itself). */
export const WEEKLY_DIGEST_AUTOPICK_INSTRUCTIONS = `You are writing a WEEKLY AI NEWS DIGEST from a raw candidate pool.
- You will return ONE JSON object. Select the 3-5 most significant and diverse stories from the candidate pool and write the article about exactly those.
- Choose significance, not quantity: model releases and lab announcements first, then research, then industry/policy news. Skip minor releases, re-posts, and duplicate coverage of the same story across sources — pick the best single source per story.
- Structure: a 1-2 sentence intro naming the top story of the week, then each chosen story in 2-4 sentences (highlighting why it matters for students), then a short closing line.
- You may add a brief "From the UU AI Society" call-to-action pointing members to the listed event(s) ONLY if they are relevant; otherwise do not mention UU AI Society.
- Only cover stories present in the candidate list. Do not invent or import stories.
- Do NOT narrate your selection process. Your entire response is the JSON object.`;

/** Task instructions for a weekly digest written from an admin-curated story list. */
export const WEEKLY_DIGEST_SELECTED_INSTRUCTIONS = `You are writing a WEEKLY AI NEWS DIGEST.
- Structure: a 1-2 sentence intro, then the 3-5 most significant stories from the provided list (each covered in 2-4 sentences, highlighting why it matters for students), then a short closing line.
- You may add a brief "From the UU AI Society" call-to-action pointing members to the listed event(s) ONLY if they are relevant; otherwise do not mention UU AI Society.
- Only cover stories from the provided list. Do not add stories that are not listed.`;

/** Task instructions for an upcoming-event preview article. */
export const EVENT_PREVIEW_INSTRUCTIONS = `You are writing an EVENT PREVIEW for a UU AI Society event.
- Structure: an engaging intro, what the event is and why it matters, what attendees will learn or experience, practical details (when, where), how to register, then connect it to one or two of the provided news stories if they are relevant.
- Base practical details ONLY on the provided event information. Do not invent dates, locations, or speakers.`;

/** Task instructions for a recap of an event that already happened. */
export const EVENT_RECAP_INSTRUCTIONS = `You are writing an EVENT RECAP for a UU AI Society event that already happened.
- Structure: an engaging intro, what happened at the event (key highlights and takeaways), any details from the admin notes, and a "what's next" closing that points to upcoming events.
- Only state facts that are supported by the provided event details and admin notes. Never invent specific quotes, numbers, or attendance figures.`;

/** Output schema and hard rules appended to every generation request. */
export const OUTPUT_FORMAT_RULES = `OUTPUT FORMAT: Return JSON only, matching this exact schema:
{
  "title": "A compelling, specific title (max 12 words)",
  "excerpt": "One punchy sentence (max 25 words) that makes a reader want to open the article",
  "contentHtml": "The full article as HTML. Use <h2> or <h3> for section headings, <p> for paragraphs, <ul>/<li> for lists, and <a href="..."> for story and event links. Do NOT wrap in <html>/<body>.",
  "tags": ["2 to 5 lowercase tags, e.g. "ai news", "events""],
  "sources": [{"title": "Story title", "url": "exact url from the news items list"}],
  "image": "always an empty string — the platform selects a suitable hero image. Never invent an image URL."
}

RULES:
- contentHtml must be between 400 and 700 words.
- sources are required — list every story you reference, with the exact title and url from the news items list above.
- image must be an empty string. Never provide or invent an image URL.
- Be strictly factual; never invent details, quotes, or numbers.
- Your ENTIRE response is the JSON object above. Do not include reasoning, commentary, markdown code fences, or any text before or after the JSON.`;

/** Sent when the model's previous response wasn't parseable JSON. */
export const REPAIR_INSTRUCTION =
  'Your previous response was not valid JSON. Reply with ONLY a single valid JSON object matching the requested schema. No markdown, no prose, no reasoning — just the JSON.';

/** Generation tuning — shared by the server (generate.ts) and the admin settings UI. */
export const MIN_OUTPUT_TOKENS = 1024;
export const MAX_OUTPUT_TOKENS = 16384;
export const DEFAULT_TEMPERATURE = 0.7;
export const REPAIR_TEMPERATURE = 0;

export const DEFAULT_BLOG_AI_SETTINGS: BlogAISettings = {
  systemPrompt: DEFAULT_BLOG_SYSTEM_PROMPT,
  model: 'openai/gpt-4o-mini',
  feeds: DEFAULT_BLOG_FEEDS,
  exaQuery: 'major AI news, model releases, and AI research breakthroughs this week',
  editorialNotes: DEFAULT_EDITORIAL_NOTES,
  maxOutputTokens: 4096,
  updatedAt: null,
  updatedBy: null,
};
