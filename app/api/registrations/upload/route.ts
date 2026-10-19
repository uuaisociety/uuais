import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/server-auth';
import { adminDb } from '@/lib/firebase-admin';
import { checkWindow } from '@/lib/rate-limit-in-memory';
import {
  getFormFile,
  MULTIPART_OVERHEAD_BYTES,
  readBoundedFormData,
} from '@/lib/bounded-request-body';
import {
  MAX_PDF_BYTES,
  sanitizePdfFileName,
  validatePdfFile,
} from '@/lib/pdf-upload';
import { saveFileToStorage } from '@/lib/storage-upload';

const UPLOAD_LIMIT = 10;
const UPLOAD_WINDOW_MS = 10 * 60 * 1000;
const EVENT_ID_RE = /^[A-Za-z0-9_-]{1,128}$/;
const MAX_MULTIPART_BYTES = MAX_PDF_BYTES + MULTIPART_OVERHEAD_BYTES;

/**
 * POST /api/registrations/upload
 *
 * Accepts multipart/form-data with:
 * - eventId: the event the file belongs to (required)
 * - file: PDF file (required)
 *
 * Members attach a PDF to an event registration. Files are
 * written server-side under registrations/{eventId}/{uid}/ — Storage rules deny
 * all client writes — and admins download them via the admin route.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth.ok)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const uid = auth.session.uid;

    const rate = checkWindow(
      `registration-upload:${uid}`,
      UPLOAD_LIMIT,
      UPLOAD_WINDOW_MS,
    );
    if (!rate.allowed) {
      return NextResponse.json(
        {
          error: 'Too many uploads. Please try again later.',
          resetAt: new Date(rate.resetAt).toISOString(),
        },
        { status: 429 },
      );
    }

    const formData = await readBoundedFormData(req, MAX_MULTIPART_BYTES);
    if (!formData)
      return NextResponse.json({ error: 'Request too large' }, { status: 413 });

    const eventId = String(formData.get('eventId') || '');
    if (!EVENT_ID_RE.test(eventId)) {
      return NextResponse.json({ error: 'Invalid event id' }, { status: 400 });
    }

    const file = getFormFile(formData, 'file');
    if (!file)
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });

    const profile = await adminDb.collection('users').doc(uid).get();
    if (
      !profile.exists ||
      (profile.data() as { isMember?: unknown } | undefined)?.isMember !== true
    ) {
      return NextResponse.json(
        { error: 'Membership required' },
        { status: 403 },
      );
    }

    const event = await adminDb.collection('events').doc(eventId).get();
    if (!event.exists)
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });

    const pdfError = await validatePdfFile(file, 'File');
    if (pdfError)
      return NextResponse.json({ error: pdfError }, { status: 400 });

    const safeName = sanitizePdfFileName(file.name);
    if (!safeName)
      return NextResponse.json({ error: 'Invalid filename' }, { status: 400 });

    const path = `registrations/${eventId}/${uid}/${Date.now()}_${safeName}`;
    await saveFileToStorage(file, path);

    return NextResponse.json({ path, name: safeName, size: file.size });
  } catch (err) {
    console.error('registration upload error', err);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
