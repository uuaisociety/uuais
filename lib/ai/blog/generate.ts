import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase-admin';
import { generateStructured, generateCompletion, streamCompletion, tryParseJson, type Message } from '@/lib/ai/openrouter';
import { slugify } from '@/lib/slugify';
import { previewImageFor } from '@/lib/blog-preview';
import { AI_DESK_AUTHOR, WEEKLY_DIGEST_AUTOPICK_INSTRUCTIONS, WEEKLY_DIGEST_SELECTED_INSTRUCTIONS, EVENT_PREVIEW_INSTRUCTIONS, EVENT_RECAP_INSTRUCTIONS, OUTPUT_FORMAT_RULES, REPAIR_INSTRUCTION, MIN_OUTPUT_TOKENS, MAX_OUTPUT_TOKENS, DEFAULT_TEMPERATURE, REPAIR_TEMPERATURE, DEFAULT_BLOG_AI_SETTINGS } from './defaults';
import { normalizeContentHtml } from './html';
import { addSeenNewsUrls } from './seen';
import { getBlogAISettings } from './settings';
import { normalizeNewsUrl } from './news';
import { fetchEngagementFeedback } from './feedback';
import type { BlogAISettings, BlogPostType, GeneratedBlogResult, NewsItem } from './types';

/** Resolve the output token budget from settings, clamped to the shared bounds so
 *  a low setting can't truncate articles and an extreme one can't blow up cost. */
function resolveMaxTokens(maxOutputTokens?: number): number {
  const budget = maxOutputTokens && Number.isFinite(maxOutputTokens)
    ? maxOutputTokens
    : DEFAULT_BLOG_AI_SETTINGS.maxOutputTokens;
  return Math.max(MIN_OUTPUT_TOKENS, Math.min(MAX_OUTPUT_TOKENS, budget));
}
const MAX_EVENTS_IN_CONTEXT = 3;

interface ServerEvent {
  id: string;
  title: string;
  description: string;
  location: string;
  eventStartAt: string;
  status?: string;
}

export interface GenerateBlogDraftInput {
  type: BlogPostType;
  /** Admin-curated stories (used when `autoPick` is false). */
  selectedItems: NewsItem[];
  /** Auto mode: the agent researches and picks the most significant stories itself. */
  autoPick?: boolean;
  /** Full candidate pool for auto mode — fetched server-side before generation. */
  allCandidates?: NewsItem[];
  notes?: string;
  eventId?: string;
}

function formatEventDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

function eventSummary(event: ServerEvent): string {
  const parts = [
    `Title: ${event.title}`,
    `When: ${formatEventDate(event.eventStartAt)}`,
    event.location ? `Where: ${event.location}` : '',
    event.description ? `About: ${event.description.slice(0, 250)}${event.description.length > 250 ? '…' : ''}` : '',
  ].filter(Boolean);
  return parts.join('\n');
}

async function fetchUpcomingEvents(): Promise<ServerEvent[]> {
  try {
    const now = new Date().toISOString();
    const snapshot = await adminDb
      .collection('events')
      .where('published', '==', true)
      .where('eventStartAt', '>=', now)
      .orderBy('eventStartAt', 'asc')
      .limit(MAX_EVENTS_IN_CONTEXT + 2)
      .get();
    return snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        title: data.title || 'Untitled event',
        description: data.description || '',
        location: data.location || '',
        eventStartAt: data.eventStartAt || '',
        status: data.status,
      };
    });
  } catch (e) {
    console.warn('Failed to fetch upcoming events:', e);
    return [];
  }
}

async function fetchPastEvent(eventId: string): Promise<ServerEvent | null> {
  try {
    const docSnap = await adminDb.collection('events').doc(eventId).get();
    const data = docSnap.exists ? docSnap.data() : null;
    if (!data) return null;
    return {
      id: docSnap.id,
      title: data.title || 'Untitled event',
      description: data.description || '',
      location: data.location || '',
      eventStartAt: data.eventStartAt || '',
      status: data.status,
    };
  } catch (e) {
    console.warn('Failed to fetch past event:', e);
    return null;
  }
}

function buildNewsBlock(items: NewsItem[]): string {
  if (items.length === 0) return '(no news items provided)';
  return items
    .map((item, i) => {
      return [
        `${i + 1}. ${item.title}`,
        `   URL: ${item.url}`,
        `   Source: ${item.source}${item.publishedAt ? ` · ${formatEventDate(item.publishedAt)}` : ''}`,
        `   Summary: ${item.snippet || 'No summary provided.'}`,
      ].join('\n');
    })
    .join('\n\n');
}

function buildTypeInstructions(type: BlogPostType, autoPick: boolean): string {
  if (type === 'weekly-digest') {
    return autoPick ? WEEKLY_DIGEST_AUTOPICK_INSTRUCTIONS : WEEKLY_DIGEST_SELECTED_INSTRUCTIONS;
  }
  if (type === 'event-preview') {
    return EVENT_PREVIEW_INSTRUCTIONS;
  }
  return EVENT_RECAP_INSTRUCTIONS;
}

function buildUserMessage(
  input: GenerateBlogDraftInput,
  upcoming: ServerEvent[],
  pastEvent: ServerEvent | null,
  settings: { model: string; editorialNotes: string },
  engagementFeedback: string
): string {
  const type = input.type;
  const autoPick = Boolean(input.autoPick && input.allCandidates && input.allCandidates.length > 0);
  const instructions = buildTypeInstructions(type, autoPick);
  const newsBlock = autoPick
    ? buildNewsBlock(input.allCandidates as NewsItem[])
    : buildNewsBlock(input.selectedItems);
  const eventsBlock =
    upcoming.length > 0
      ? upcoming.map(eventSummary).join('\n\n')
      : '(no upcoming events found — you may omit the event call-to-action section)';
  const pastBlock =
    pastEvent
      ? `Past event to recap:\n${eventSummary(pastEvent)}`
      : '(no past event details provided)';
  const notesBlock =
    input.notes && input.notes.trim().length > 0
      ? `Admin notes (treat as authoritative, incorporate where relevant):\n${input.notes.trim()}`
      : '(no admin notes provided)';
  const editorialBlock =
    settings.editorialNotes && settings.editorialNotes.trim().length > 0
      ? `EDITORIAL PRIORITIES (watch items + reader feedback — honor these):\n${settings.editorialNotes.trim()}`
      : '(no editorial priorities provided)';
  const feedbackBlock =
    engagementFeedback && engagementFeedback.trim().length > 0
      ? `ENGAGEMENT FEEDBACK FROM PAST AI NEWS DESK POSTS (learn from it):
${engagementFeedback}

Use this to guide topic selection and framing: lean into what performed well (high reads/likes/shares, low dislikes) and avoid what performed poorly.`
      : '';

  return `TASK: ${instructions}

TYPE: ${type}
MODEL: ${settings.model}

${autoPick ? `CANDIDATE NEWS POOL (pick the most significant stories from this list):\n${newsBlock}` : `NEWS ITEMS (only use these):\n${newsBlock}`}

UPCOMING UU AI SOCIETY EVENTS:
${eventsBlock}

${type === 'event-recap' ? pastBlock : ''}

${notesBlock}

${editorialBlock}

${feedbackBlock}

${OUTPUT_FORMAT_RULES}`;
}

function normalizeTags(tags: unknown): string[] {
  if (!Array.isArray(tags)) return ['ai news'];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const tag of tags) {
    const t = String(tag ?? '').trim().replace(/\s+/g, ' ');
    if (!t || t.length > 40) continue;
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
    if (out.length >= 5) break;
  }
  return out.length > 0 ? out : ['ai news'];
}

function normalizeSources(sources: unknown): { title: string; url: string }[] {
  if (!Array.isArray(sources)) return [];
  const seen = new Set<string>();
  const out: { title: string; url: string }[] = [];
  for (const s of sources) {
    if (!s || typeof s !== 'object') continue;
    const title = String((s as { title?: unknown }).title ?? '').trim().slice(0, 200);
    const url = String((s as { url?: unknown }).url ?? '').trim();
    if (!title || !url) continue;
    if (seen.has(url)) continue;
    seen.add(url);
    out.push({ title, url });
    if (out.length >= 12) break;
  }
  return out;
}

/** In auto-pick mode, restrict cited sources to URLs that were actually in the candidate pool. */
function filterSourcesToCandidates(
  sources: { title: string; url: string }[],
  candidates: NewsItem[]
): { title: string; url: string }[] {
  const allowed = new Set(candidates.map((c) => normalizeNewsUrl(c.url)));
  return sources.filter((s) => {
    try {
      return allowed.has(normalizeNewsUrl(s.url));
    } catch {
      return false;
    }
  });
}

interface EventContext {
  upcoming: ServerEvent[];
  pastEvent: ServerEvent | null;
}

async function loadEventContext(input: GenerateBlogDraftInput): Promise<EventContext> {
  if (input.type === 'event-recap' && input.eventId) {
    return { upcoming: [], pastEvent: await fetchPastEvent(input.eventId) };
  }
  return { upcoming: await fetchUpcomingEvents(), pastEvent: null };
}

function buildMessages(
  input: GenerateBlogDraftInput,
  settings: BlogAISettings,
  context: EventContext,
  engagementFeedback: string
): Message[] {
  return [
    { role: 'system', content: settings.systemPrompt },
    {
      role: 'user',
      content: buildUserMessage(input, context.upcoming, context.pastEvent, settings, engagementFeedback),
    },
  ];
}

const MAX_REASONING_TRACE = 20000;

async function persistDraft(
  input: GenerateBlogDraftInput,
  settings: BlogAISettings,
  authorUid: string,
  upcoming: ServerEvent[],
  result: GeneratedBlogResult,
  reasoning?: string
): Promise<{ draftId: string }> {
  const title = String(result.title ?? '').trim().slice(0, 140) || 'AI News Desk article';
  const excerpt = String(result.excerpt ?? '').trim().slice(0, 300) || 'Read the latest from the UU AI Society AI News Desk.';
  const contentHtml = normalizeContentHtml(String(result.contentHtml ?? '').trim());
  const rawImage = String(result.image ?? '').trim().slice(0, 500);
  const image = /^https?:\/\/\S+$/i.test(rawImage) ? rawImage : previewImageFor(title);
  const autoPick = Boolean(input.autoPick && input.allCandidates && input.allCandidates.length > 0);
  let sources = normalizeSources(result.sources);
  if (autoPick && input.allCandidates) {
    sources = filterSourcesToCandidates(sources, input.allCandidates);
  }
  const relatedEventIds = input.eventId ? [input.eventId] : upcoming.slice(0, 3).map((e) => e.id);

  const draft = {
    title,
    excerpt,
    content: contentHtml || '<p></p>',
    author: AI_DESK_AUTHOR,
    date: new Date().toISOString().split('T')[0],
    image,
    tags: normalizeTags(result.tags),
    published: false,
    authorType: 'ai' as const,
    sources,
    relatedEventIds,
    aiModel: settings.model,
    reviewedBy: '',
    generatedByUid: authorUid,
    ...(reasoning && reasoning.trim().length > 0
      ? { reasoningTrace: reasoning.trim().slice(0, MAX_REASONING_TRACE) }
      : {}),
  };

  const draftRef = await adminDb.collection('blogPosts').add(draft);
  // The cited URLs are now "used" — the agent skips them, and they show up in the
  // admin's toggleable used-articles list. Releasing them happens on post delete.
  try {
    await addSeenNewsUrls(sources.map((s) => s.url));
  } catch (e) {
    console.warn('Failed to mark draft sources as seen:', e);
  }
  try {
    await adminDb
      .collection('analyticsBlogs')
      .doc(draftRef.id)
      .set({ reads: 0, updatedAt: FieldValue.serverTimestamp() });
  } catch (e) {
    console.warn('Failed to initialise analyticsBlogs doc:', e);
  }
  try {
    await adminDb
      .collection('blogReactions')
      .doc(draftRef.id)
      .set({ likes: 0, dislikes: 0, shares: 0, updatedAt: FieldValue.serverTimestamp() });
  } catch (e) {
    console.warn('Failed to initialise blogReactions doc:', e);
  }
  try {
    let slug = slugify(title);
    const clash = await adminDb.collection('blogPosts').where('slug', '==', slug).limit(1).get();
    if (!clash.empty) slug = `${slug}-${draftRef.id.slice(-4)}`;
    await draftRef.update({ slug });
  } catch (e) {
    console.warn('Failed to assign draft slug:', e);
  }

  return { draftId: draftRef.id };
}

export async function generateBlogDraft(
  input: GenerateBlogDraftInput,
  authorUid: string
): Promise<{ draftId: string; usage: { promptTokens: number; completionTokens: number; totalTokens: number } }> {
  const settings = await getBlogAISettings();
  const context = await loadEventContext(input);
  const engagementFeedback = await fetchEngagementFeedback();
  const messages = buildMessages(input, settings, context, engagementFeedback);

  const response = await generateStructured<GeneratedBlogResult>(messages, {
    model: settings.model,
    maxTokens: resolveMaxTokens(settings.maxOutputTokens),
    temperature: DEFAULT_TEMPERATURE,
  });

  const { draftId } = await persistDraft(input, settings, authorUid, context.upcoming, response.data, response.reasoning);
  return { draftId, usage: response.usage };
}

export type DraftStreamEvent =
  | { type: 'reasoning'; text: string }
  | { type: 'delta'; text: string }
  | { type: 'status'; text: string };

export type DraftStreamResult =
  | { ok: true; draftId: string; usage: { promptTokens: number; completionTokens: number; totalTokens: number } }
  | { ok: false; message: string; raw: string };

/**
 * Streaming draft generation for the admin UI. Each model delta is forwarded via
 * `emit` so the admin can watch the AI News Desk work in real time (reasoning is
 * surfaced separately for immersion). If the model returns malformed JSON, the
 * first attempt is kept for visibility, a repair retry runs, and the error (with
 * the raw model output) is reported so the admin can see exactly what happened.
 */
export async function generateBlogDraftStream(
  input: GenerateBlogDraftInput,
  authorUid: string,
  emit: (event: DraftStreamEvent) => void
): Promise<DraftStreamResult> {
  const settings = await getBlogAISettings();
  const context = await loadEventContext(input);
  const engagementFeedback = await fetchEngagementFeedback();
  const messages = buildMessages(input, settings, context, engagementFeedback);

  emit({ type: 'status', text: 'Drafting…' });

  try {
    const streamed = await streamCompletion(
      messages,
      { model: settings.model, maxTokens: resolveMaxTokens(settings.maxOutputTokens), temperature: DEFAULT_TEMPERATURE },
      (chunk) => {
        if (chunk.reasoning) emit({ type: 'reasoning', text: chunk.reasoning });
        if (chunk.content) emit({ type: 'delta', text: chunk.content });
      }
    );

    let parsed = tryParseJson<GeneratedBlogResult>(streamed.content);
    let usage = streamed.usage;
    let reasoning = streamed.reasoning;

    if (parsed === undefined) {
      emit({ type: 'status', text: 'Response wasn’t clean JSON — retrying…' });
      const repair = await generateCompletion(
        [...messages, { role: 'assistant', content: streamed.content }, { role: 'user', content: REPAIR_INSTRUCTION }],
        { model: settings.model, maxTokens: resolveMaxTokens(settings.maxOutputTokens), temperature: REPAIR_TEMPERATURE }
      );
      parsed = tryParseJson<GeneratedBlogResult>(repair.content);
      usage = {
        promptTokens: streamed.usage.promptTokens + repair.usage.promptTokens,
        completionTokens: streamed.usage.completionTokens + repair.usage.completionTokens,
        totalTokens: streamed.usage.totalTokens + repair.usage.totalTokens,
      };
      if (repair.reasoning) reasoning = [reasoning, repair.reasoning].filter(Boolean).join('\n\n');
      if (parsed === undefined) {
        return { ok: false, message: 'The model did not return valid JSON after retrying. See the raw output above.', raw: streamed.content };
      }
      emit({ type: 'status', text: 'Recovered from malformed JSON.' });
    }

    emit({ type: 'status', text: 'Saving draft…' });
    const { draftId } = await persistDraft(input, settings, authorUid, context.upcoming, parsed, reasoning);
    return { ok: true, draftId, usage };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Generation failed';
    emit({ type: 'status', text: 'Generation failed.' });
    return { ok: false, message, raw: '' };
  }
}
