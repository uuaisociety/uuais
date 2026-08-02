import { handleApplicationPost } from '@/lib/apply-handler';
import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  return handleApplicationPost(req, 'team');
}
