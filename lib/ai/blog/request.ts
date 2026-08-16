import { VALID_TYPES } from './defaults';
import type { BlogPostType, NewsItem } from './types';

export interface GenerateRequestInput {
  type: BlogPostType;
  selectedItems: NewsItem[];
  autoPick: boolean;
  notes?: string;
  eventId?: string;
}

export type GenerateRequestResult =
  | { ok: true; input: GenerateRequestInput }
  | { ok: false; status: number; error: string; message: string };

export function normalizeSelectedItems(items: unknown): NewsItem[] {
  if (!Array.isArray(items)) return [];
  return items
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
    .map((item) => ({
      id: String(item.id ?? '').slice(0, 100),
      title: String(item.title ?? '').trim().slice(0, 300),
      url: String(item.url ?? '').trim().slice(0, 1000),
      source: String(item.source ?? '').trim().slice(0, 100),
      publishedAt: typeof item.publishedAt === 'string' ? item.publishedAt.slice(0, 100) : undefined,
      snippet: String(item.snippet ?? '').trim().slice(0, 1000),
    }))
    .filter((item) => item.title.length > 0 && item.url.length > 0);
}

/** Validate + normalize a blog generation request body (shared by stream + non-stream routes). */
export function parseGenerateRequest(body: unknown): GenerateRequestResult {
  if (typeof body !== 'object' || body === null) {
    return { ok: false, status: 400, error: 'Bad request', message: 'Invalid JSON body' };
  }
  const parsed = body as Record<string, unknown>;

  const type = parsed.type;
  if (typeof type !== 'string' || !VALID_TYPES.includes(type as BlogPostType)) {
    return { ok: false, status: 400, error: 'Bad request', message: `type must be one of: ${VALID_TYPES.join(', ')}` };
  }

  const selectedItems = normalizeSelectedItems(parsed.selectedItems);
  const autoPick = parsed.autoPick === true && type === 'weekly-digest';
  const notes = typeof parsed.notes === 'string' ? parsed.notes.trim().slice(0, 5000) : undefined;
  const eventId = typeof parsed.eventId === 'string' && parsed.eventId.trim() ? parsed.eventId.trim().slice(0, 100) : undefined;

  if (type === 'weekly-digest' && selectedItems.length === 0 && !autoPick) {
    return { ok: false, status: 400, error: 'Bad request', message: 'Select at least one news item to write a weekly digest' };
  }
  if ((type === 'event-preview' || type === 'event-recap') && !eventId) {
    return { ok: false, status: 400, error: 'Bad request', message: `Select an event for a ${type}` };
  }

  return { ok: true, input: { type: type as BlogPostType, selectedItems, autoPick, notes, eventId } };
}
