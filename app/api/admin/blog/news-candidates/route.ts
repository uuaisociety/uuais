import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requireAdmin, authFailureResponse } from '@/lib/server-auth';
import { fetchNewsCandidates } from '@/lib/ai/blog/news';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.ok) return authFailureResponse(auth.reason);

    let body: { query?: unknown; limit?: unknown } = {};
    try {
      body = await req.json();
    } catch {
      // Empty body is fine — use defaults.
    }

    const query = typeof body.query === 'string' && body.query.trim() ? body.query.trim().slice(0, 200) : undefined;
    const limit = typeof body.limit === 'number' && Number.isFinite(body.limit) ? Math.round(body.limit) : undefined;

    const result = await fetchNewsCandidates({ query, limit });

    return NextResponse.json({
      success: true,
      candidates: result.candidates,
      sources: result.sources,
      warnings: result.warnings,
    });
  } catch (error) {
    console.error('news-candidates API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : 'Failed to fetch news candidates' },
      { status: 500 }
    );
  }
}
