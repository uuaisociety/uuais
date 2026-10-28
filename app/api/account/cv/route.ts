import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requireAuth, authFailureResponse } from '@/lib/server-auth';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { checkWindow } from '@/lib/rate-limit-in-memory';
import {
  getFormFile,
  MULTIPART_OVERHEAD_BYTES,
  readBoundedFormData,
} from '@/lib/bounded-request-body';
import {
  MAX_PDF_BYTES,
  findPdfActiveContent,
  sanitizePdfFileName,
  validatePdfFile,
} from '@/lib/pdf-upload';
import { saveFileToStorage } from '@/lib/storage-upload';
import { scanPdfBuffer } from '@/lib/malware-scan';
import { deleteStorageFiles } from '@/lib/server-registration-files';
import { CV_CONSENT_VERSION } from '@/lib/cv-consent';
import { logAdminAction } from '@/lib/server-audit-log';

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
    // Membership is self-declared, so a verified email is what ties a shared CV
    // to a real person partners can contact. Checked live, so a member who just
    // linked Google isn't held back by an older session token.
    const verified =
      auth.session.emailVerified ||
      (await adminAuth
        .getUser(uid)
        .then((u) => u.emailVerified)
        .catch(() => false));
    if (!verified) {
      return NextResponse.json(
        {
          error:
            'To share your CV, your email needs to be verified. Link your Google account under Linked Accounts, then try again.',
        },
        { status: 403 },
      );
    }
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
    // CVs go straight to partner companies, so refuse anything that can act.
    const active = await findPdfActiveContent(buffer);
    if (active) {
      console.warn(`CV upload rejected for ${uid}: active content (${active})`);
      return NextResponse.json(
        {
          error:
            'This PDF contains scripts, attachments or interactive content, so we can’t share it with partners. Please export your CV again as a plain PDF.',
        },
        { status: 400 },
      );
    }
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
    const usersRef = adminDb.collection('users').doc(uid);
    const cvRef = adminDb.collection('cvs').doc(uid);
    // One transaction, re-reading the profile: if the account was erased while
    // this upload was being scanned and saved, don't resurrect its CV.
    const stored = await adminDb.runTransaction(async (tx) => {
      const [user, existing] = await Promise.all([
        tx.get(usersRef),
        tx.get(cvRef),
      ]);
      if (!user.exists) return false;
      // Sharing a CV switches partner contact on (rules keep it on); remember the
      // member's own choice from before their first upload so removing the CV
      // restores it. A replacement keeps the original choice.
      const prior = existing.exists
        ? existing.get('priorPartnerContactOptIn') === true
        : user.get('partnerContactOptIn') === true;
      tx.set(cvRef, { ...cv, priorPartnerContactOptIn: prior });
      tx.set(
        usersRef,
        { partnerContactOptIn: true, updatedAt: now },
        { merge: true },
      );
      return true;
    });
    if (!stored) {
      await deleteStorageFiles([path]);
      return NextResponse.json(
        { error: 'Your account no longer exists.' },
        { status: 409 },
      );
    }

    // Consent history (kept 30 days with the other access logs). Best-effort:
    // the current consent itself lives on cvs/{uid}.
    await logAdminAction({
      action: 'consent-granted',
      adminUid: uid,
      path,
      consentVersion: CV_CONSENT_VERSION,
    });

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
 * withdraws consent, and restores the partner-contact choice the member had
 * before sharing. File first, so a failure never leaves an unlisted file.
 */
export async function DELETE(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth.ok) return authFailureResponse(auth.reason);
    const { uid } = auth.session;
    const limited = rateLimited(uid);
    if (limited) return limited;

    const cvRef = adminDb.collection('cvs').doc(uid);
    const record = await cvRef.get();
    await deleteStorageFiles([cvPath(uid)], { failOnError: true });
    await cvRef.delete();
    if (record.exists) {
      const usersRef = adminDb.collection('users').doc(uid);
      const user = await usersRef.get();
      if (user.exists)
        await usersRef.update({
          partnerContactOptIn: record.get('priorPartnerContactOptIn') === true,
          updatedAt: new Date().toISOString(),
        });
      await logAdminAction({
        action: 'consent-withdrawn',
        adminUid: uid,
        path: cvPath(uid),
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('cv delete error', err);
    return NextResponse.json(
      { error: 'Could not remove your CV. Please try again.' },
      { status: 500 },
    );
  }
}
