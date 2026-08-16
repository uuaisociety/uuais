import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requireAdmin, authFailureResponse } from '@/lib/server-auth';
import { generateBlogDraft } from '@/lib/ai/blog/generate';
import { fetchNewsCandidates } from '@/lib/ai/blog/news';
import { incrementUsage } from '@/lib/ai/rate-limit';
import { OpenRouterError } from '@/lib/ai/openrouter';
import { parseGenerateRequest } from '@/lib/ai/blog/request';
import { MAX_CANDIDATES_FOR_AUTO } from '@/lib/ai/blog/defaults';
import type { NewsItem } from '@/lib/ai/blog/types';

export const runtime = 'nodejs';
// Non-streamed generation (feed fetch + single OpenRouter call) can exceed a minute.
// Keep in sync with BLOG_GENERATION_MAX_DURATION in lib/ai/blog/defaults.ts.
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
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
      return NextResponse.json({ error: parsed.error, message: parsed.message }, { status: parsed.status });
    }
    const { input } = parsed;

    // Auto mode: gather candidates server-side and let the model pick the most significant stories.
    let allCandidates: NewsItem[] | undefined;
    if (input.autoPick) {
      const result = await fetchNewsCandidates({ limit: MAX_CANDIDATES_FOR_AUTO });
      allCandidates = result.candidates;
    }

    const { draftId, usage } = await generateBlogDraft(
      { ...input, allCandidates },
      auth.session.uid
    );

    try {
      await incrementUsage(auth.session.uid, usage.totalTokens);
    } catch (e) {
      console.warn('Failed to record blog generation usage:', e);
    }

    return NextResponse.json({
      success: true,
      draftId,
      usage,
    });
  } catch (error) {
    console.error('blog generate API error:', error);

    if (error instanceof OpenRouterError) {
      const statusCode = error.statusCode || 503;
      return NextResponse.json(
        {
          error: 'AI service error',
          message: statusCode === 401 ? 'AI provider authentication failed. Please contact an admin.' : 'The AI service is temporarily unavailable. Please try again in a moment.',
        },
        { status: statusCode }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to generate blog draft' },
      { status: 500 }
    );
  }
}
