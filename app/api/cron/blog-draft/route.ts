import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { generateBlogDraft } from '@/lib/ai/blog/generate';
import { fetchNewsCandidates } from '@/lib/ai/blog/news';

export const runtime = 'nodejs';
// Non-streamed generation (feed fetch + single OpenRouter call) can exceed a minute.
// Keep in sync with BLOG_GENERATION_MAX_DURATION in lib/ai/blog/defaults.ts.
export const maxDuration = 300;

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** True if a PUBLISHED AI post exists from the last 7 days (unpublished drafts never block the cron). */
async function hasRecentAiDigest(): Promise<boolean> {
  const weekAgo = new Date(Date.now() - WEEK_MS).toISOString().split('T')[0];
  try {
    const snapshot = await adminDb
      .collection('blogPosts')
      .where('authorType', '==', 'ai')
      .where('published', '==', true)
      .get();
    for (const docSnap of snapshot.docs) {
      const date = docSnap.data()?.date;
      if (typeof date === 'string' && date >= weekAgo) return true;
    }
  } catch (e) {
    console.warn('Failed to check recent AI digests:', e);
  }
  return false;
}

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    if (await hasRecentAiDigest()) {
      return NextResponse.json({ success: true, skipped: true, reason: 'An AI digest already exists from the last 7 days' });
    }

    const { candidates, warnings } = await fetchNewsCandidates({ limit: 40 });
    if (candidates.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No news candidates available', warnings },
        { status: 502 }
      );
    }

    const { draftId } = await generateBlogDraft(
      {
        type: 'weekly-digest',
        selectedItems: [],
        autoPick: true,
        allCandidates: candidates,
        notes: 'Automated weekly digest — please review before publishing.',
      },
      'cron'
    );

    return NextResponse.json({ success: true, draftId, warnings });
  } catch (error) {
    console.error('cron blog-draft error:', error);
    return NextResponse.json({ success: false, error: 'Weekly digest generation failed' }, { status: 500 });
  }
}
