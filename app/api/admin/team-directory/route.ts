import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { revalidateTag } from 'next/cache';
import { requireAdmin, authFailureResponse } from '@/lib/server-auth';
import { TEAM_DIRECTORY_TAG } from '@/lib/server-data-cache';

/**
 * POST /api/admin/team-directory: the admin dashboard calls this after adding, editing,
 * moving or removing a team member. The public directory is cached for a day; this drops
 * it so the next visitor reads the new roster.
 */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return authFailureResponse(auth.reason);
  // Not 'max': an admin checking the About page right after saving expects the change.
  revalidateTag(TEAM_DIRECTORY_TAG, { expire: 0 });
  return NextResponse.json({ ok: true });
}
