import { NextResponse } from 'next/server';
import { TEAM_CATEGORIES, type TeamCategory } from '@/types';
import { getCachedPublicTeamDirectory } from '@/lib/server-data-cache';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const hasTeam = url.searchParams.has('team');
  const hasYear = url.searchParams.has('year');
  const teamParam = url.searchParams.get('team');
  const yearParam = url.searchParams.get('year');
  if (
    (hasTeam &&
      (!teamParam || !TEAM_CATEGORIES.includes(teamParam as TeamCategory))) ||
    (hasYear &&
      (!yearParam || (yearParam !== 'all' && !/^\d{4}$/.test(yearParam))))
  ) {
    return NextResponse.json(
      { error: 'Invalid team directory selection' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    );
  }
  try {
    const directory = await getCachedPublicTeamDirectory(
      teamParam as TeamCategory | undefined,
      yearParam === null
        ? undefined
        : yearParam === 'all'
          ? 'all'
          : Number(yearParam),
    );
    return NextResponse.json(directory, {
      headers: { 'Cache-Control': 'public, max-age=60' },
    });
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch team members' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
