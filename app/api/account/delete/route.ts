import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requireAuth, authFailureResponse } from '@/lib/server-auth';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { checkWindow } from '@/lib/rate-limit-in-memory';
import {
  collectRegistrationFilePaths,
  deleteStorageFiles,
} from '@/lib/server-registration-files';

export const runtime = 'nodejs';

const DELETE_LIMIT = 3;
const DELETE_WINDOW_MS = 60 * 60 * 1000;

/**
 * POST /api/account/delete
 *
 * Self-service erasure: removes the caller's registrations (and attached
 * PDFs), attendance entries, newsletter subscription, profile document, and
 * Firebase Auth account. Required by GDPR Art. 17.
 */
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return authFailureResponse(auth.reason);
  const { uid } = auth.session;

  if (!checkWindow(`account-delete:${uid}`, DELETE_LIMIT, DELETE_WINDOW_MS)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  try {
    const filePaths = new Set<string>();

    const regsSnap = await adminDb
      .collection('registrations')
      .where('userId', '==', uid)
      .get();
    for (const docSnap of regsSnap.docs) {
      collectRegistrationFilePaths(docSnap.data())?.forEach((p) =>
        filePaths.add(p),
      );
    }

    let deletedDocs = 0;
    while (true) {
      const page = await adminDb
        .collection('registrations')
        .where('userId', '==', uid)
        .limit(400)
        .get();
      if (page.empty) break;
      const batch = adminDb.batch();
      page.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
      deletedDocs += page.size;
      if (deletedDocs > 5000) break;
    }

    const attendanceSnap = await adminDb.collection('eventAttendance').get();
    for (const docSnap of attendanceSnap.docs) {
      const entries = docSnap.get('entries');
      if (!Array.isArray(entries)) continue;
      const filtered = entries.filter(
        (e: { userId?: string }) => e?.userId !== uid,
      );
      if (filtered.length !== entries.length)
        await docSnap.ref.update({ entries: filtered });
    }

    await adminDb.collection('users').doc(uid).delete();
    await deleteStorageFiles(Array.from(filePaths));

    let authDeleted = false;
    try {
      await adminAuth.deleteUser(uid);
      authDeleted = true;
    } catch (err) {
      console.warn('Failed to delete auth user', uid, err);
    }

    return NextResponse.json({ success: true, authDeleted });
  } catch (err) {
    console.error('account deletion error', err);
    return NextResponse.json(
      { error: 'Account deletion failed. Please contact us.' },
      { status: 500 },
    );
  }
}
