import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requireAuth, authFailureResponse } from '@/lib/server-auth';
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
import { scanPdfBuffer } from '@/lib/malware-scan';
import { deleteStorageFiles } from '@/lib/server-registration-files';
import { CV_CONSENT_VERSION } from '@/lib/cv-consent';

const CV_LIMIT = 10;
const CV_WINDOW_MS = 10 * 60 * 1000;
const MAX_MULTIPART_BYTES = MAX_PDF_BYTES + MULTIPART_OVERHEAD_BYTES;

// One CV per member at a fixed path, so a replacement overwrites the old file.
const cvPath = (uid: string) => `cvs/${uid}/cv.pdf`;

function rateLimited(uid: string): NextResponse | null {
  const rate = checkWindow(`account-cv:${uid}`, CV_LIMIT, CV_WINDOW_MS);
  if (rate.allowed) return null;
  return NextResponse.json(
    { error: 'Too many requests. Please try again later.' },
    { status: 429 },
  );
}

/**
 * POST /api/account/cv — multipart/form-data with `file` (PDF) and
 * `consent=true`. Stores the member's CV for sharing with partner companies.
 * Consent is recorded server-side with the wording version the member saw;
 * Storage and Firestore rules deny client writes to both.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth.ok) return authFailureResponse(auth.reason);
    const { uid } = auth.session;
    const limited = rateLimited(uid);
    if (limited) return limited;

    const formData = await readBoundedFormData(req, MAX_MULTIPART_BYTES);
    if (!formData)
      return NextResponse.json(
        { error: 'Your CV must be a PDF under 3 MB.' },
        { status: 413 },
      );

    if (formData.get('consent') !== 'true') {
      return NextResponse.json(
        { error: 'Consent is required to share your CV with partners' },
        { status: 400 },
      );
    }

    const file = getFormFile(formData, 'file');
    if (!file)
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });

    const profile = await adminDb.collection('users').doc(uid).get();
    if (
      (profile.data() as { isMember?: unknown } | undefined)?.isMember !== true
    ) {
      return NextResponse.json(
        { error: 'Membership required' },
        { status: 403 },
      );
    }

    const pdfError = await validatePdfFile(file, 'CV');
    if (pdfError)
      return NextResponse.json({ error: pdfError }, { status: 400 });

    const fileName = sanitizePdfFileName(file.name);
    if (!fileName)
      return NextResponse.json({ error: 'Invalid filename' }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const scan = await scanPdfBuffer(buffer, fileName);
    if (!scan.ok)
      return NextResponse.json(
        { error: scan.message || 'File rejected' },
        { status: 400 },
      );

    const path = cvPath(uid);
    await saveFileToStorage(file, path, { buffer });

    const now = new Date().toISOString();
    const cv = {
      path,
      fileName,
      size: file.size,
      uploadedAt: now,
      consentAt: now,
      consentVersion: CV_CONSENT_VERSION,
    };
    await adminDb.collection('cvs').doc(uid).set(cv);
    // Sharing a CV means partners may get in touch, so contact opt-in follows it;
    // rules keep it on until the CV is removed.
    await adminDb
      .collection('users')
      .doc(uid)
      .set({ partnerContactOptIn: true, updatedAt: now }, { merge: true });

    return NextResponse.json({ id: uid, ...cv });
  } catch (err) {
    console.error('cv upload error', err);
    return NextResponse.json(
      { error: 'Upload failed. Please try again.' },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/account/cv — removes the CV file and its consent record, which
 * withdraws consent. File first, so a failure never leaves an unlisted file.
 */
export async function DELETE(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth.ok) return authFailureResponse(auth.reason);
    const { uid } = auth.session;
    const limited = rateLimited(uid);
    if (limited) return limited;

    await deleteStorageFiles([cvPath(uid)], { failOnError: true });
    await adminDb.collection('cvs').doc(uid).delete();

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('cv delete error', err);
    return NextResponse.json(
      { error: 'Could not remove your CV. Please try again.' },
      { status: 500 },
    );
  }
}
