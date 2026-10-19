import type { NextRequest } from 'next/server';
import { handleAdminFileDownload } from '@/lib/admin-file-download';

// GET /api/admin/team-applications/resume?path=team-applications/... — streams a resume from Storage. Admin-only, same-origin so no CORS.
export async function GET(req: NextRequest) {
  return handleAdminFileDownload(req, 'team-applications/');
}
