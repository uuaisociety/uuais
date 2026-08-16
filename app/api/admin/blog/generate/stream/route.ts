import type { NextRequest } from 'next/server';
import { requireAdmin, authFailureResponse } from '@/lib/server-auth';
import { generateBlogDraftStream, type DraftStreamEvent } from '@/lib/ai/blog/generate';
import { fetchNewsCandidates } from '@/lib/ai/blog/news';
import { incrementUsage } from '@/lib/ai/rate-limit';
import { parseGenerateRequest } from '@/lib/ai/blog/request';
import { MAX_CANDIDATES_FOR_AUTO, MAX_REASONING_TRACE } from '@/lib/ai/blog/defaults';
import type { NewsItem } from '@/lib/ai/blog/types';

export const runtime = 'nodejs';
// Streaming drafts can run several minutes end to end (reasoning + JSON body).
// Keep in sync with BLOG_GENERATION_MAX_DURATION in lib/ai/blog/defaults.ts.
export const maxDuration = 300;

const encoder = new TextEncoder();

function sse(data: Record<string, unknown>): Uint8Array {
  return encoder.encode(`data: ${JSON.stringify(data)}\n\n`);
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return authFailureResponse(auth.reason);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    body = null;
  }

  const parsed = parseGenerateRequest(body);
  if (!parsed.ok) {
    return new Response(JSON.stringify({ error: parsed.error, message: parsed.message }), {
      status: parsed.status,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  const { input } = parsed;

  let allCandidates: NewsItem[] | undefined;
  if (input.autoPick) {
    const result = await fetchNewsCandidates({ limit: MAX_CANDIDATES_FOR_AUTO });
    allCandidates = result.candidates;
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let reasoningForwarded = 0;
      const emit = (event: DraftStreamEvent) => {
        if (event.type === 'reasoning') {
          reasoningForwarded += event.text.length;
          if (reasoningForwarded > MAX_REASONING_TRACE) return;
        }
        controller.enqueue(sse(event));
      };
      try {
        const result = await generateBlogDraftStream({ ...input, allCandidates }, auth.session.uid, emit);
        if (result.ok) {
          try {
            await incrementUsage(auth.session.uid, result.usage.totalTokens);
          } catch (e) {
            console.warn('Failed to record blog generation usage:', e);
          }
          controller.enqueue(sse({ type: 'done', draftId: result.draftId }));
        } else {
          controller.enqueue(sse({ type: 'error', message: result.message, raw: result.raw }));
        }
      } catch (error) {
        console.error('blog generate stream error:', error);
        controller.enqueue(
          sse({
            type: 'error',
            message: error instanceof Error ? error.message : 'Generation failed',
            raw: '',
          })
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
