import type { NextRequest } from 'next/server';
import { handleAdminFileDownload } from '@/lib/admin-file-download';

// GET /api/admin/registrations/file?path=registrations/... — streams an event-registration attachment from Storage. Admin-only, same-origin so no CORS.
export async function GET(req: NextRequest) {
  return handleAdminFileDownload(req, 'registrations/');
}
