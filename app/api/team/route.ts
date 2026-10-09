import { NextResponse } from 'next/server';
import { getPublicSeed } from '@/lib/server-data';

export async function GET() {
  const seed = await getPublicSeed();
  return NextResponse.json(
    { teamMembers: seed.teamMembers },
    { headers: { 'Cache-Control': 'public, max-age=60' } },
  );
}
