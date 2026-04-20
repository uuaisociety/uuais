import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import admin from 'firebase-admin';

export const runtime = 'nodejs';

const DEFAULT_COOLDOWN_SECONDS = 5 * 60; // 5 minutes
const DEFAULT_MAX_TOTAL_APPLICATIONS = 3;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function safeKeyPart(s: string): string {
  return encodeURIComponent(s);
}

async function saveFileToStorage(file: File, destPath: string) {
  // file is a web File/Blob
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const bucket = admin.storage().bucket();
  const gfile = bucket.file(destPath);
  await gfile.save(buffer, { metadata: { contentType: file.type || 'application/octet-stream' } });
  // Generate a signed read URL valid for 40 days
  const expires = Date.now() + 40 * 24 * 60 * 60 * 1000;
  const [url] = await gfile.getSignedUrl({ action: 'read', expires });
  return { path: destPath, url };
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();

    const name = (form.get('name') as string) || '';
    const email = (form.get('email') as string) || '';
    const phone = (form.get('phone') as string) || '';
    const agree = form.get('agree') === 'true' || form.get('agree') === 'on';
    const coverOption = (form.get('coverOption') as string) || 'text';
    const coverText = (form.get('coverText') as string) || '';
    const role = (form.get('role') as string) || '';
    const roleId = (form.get('roleId') as string) || '';

    if (!name || !email) {
      return NextResponse.json({ error: 'Missing name or email' }, { status: 400 });
    }
    if (!role) {
      return NextResponse.json({ error: 'Role is required' }, { status: 400 });
    }
    if (!agree) {
      return NextResponse.json({ error: 'Agreement required' }, { status: 400 });
    }

    const emailNormalized = normalizeEmail(email);
    // Prefer a stable role id for uniqueness; fall back to role title if older clients submit no roleId.
    const roleKey = roleId?.trim() ? `id:${roleId.trim()}` : `title:${role.trim()}`;

    const cvFile = form.get('cv') as File | null;
    if (!cvFile) {
      return NextResponse.json({ error: 'CV file is required' }, { status: 400 });
    }
    if (cvFile.type !== 'application/pdf') {
      return NextResponse.json({ error: 'CV must be a PDF' }, { status: 400 });
    }
    if (cvFile.size > 3 * 1024 * 1024) {
      return NextResponse.json({ error: 'CV must be <= 3MB' }, { status: 400 });
    }

    if (coverOption === 'file') {
      const coverFile = form.get('coverFile') as File | null;
      if (!coverFile) return NextResponse.json({ error: 'Cover file missing' }, { status: 400 });
      if (coverFile.type !== 'application/pdf') return NextResponse.json({ error: 'Cover must be PDF' }, { status: 400 });
      if (coverFile.size > 3 * 1024 * 1024) return NextResponse.json({ error: 'Cover must be <= 3MB' }, { status: 400 });
    } else {
      if (!coverText || !(coverText as string).trim()) {
        return NextResponse.json({ error: 'Cover letter text is required when choosing text option' }, { status: 400 });
      }
    }

    // -------------------------------
    // Anti-spam / duplicate protection
    // -------------------------------
    const cooldownSeconds = Number(process.env.BOARD_APPLY_COOLDOWN_SECONDS || DEFAULT_COOLDOWN_SECONDS);
    const maxTotalApplications = Number(process.env.BOARD_APPLY_MAX_TOTAL_APPLICATIONS || DEFAULT_MAX_TOTAL_APPLICATIONS);
    const nowMs = Date.now();

    // Best-effort current count (used only to initialize a counter once).
    // Prefer Firestore count() aggregation when available; fall back to snapshot size.
    let existingCount = 0;
    try {
      const existingCountSnap = await adminDb
        .collection('boardApplications')
        .where('emailNormalized', '==', emailNormalized)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .count()
        .get();
      existingCount = existingCountSnap.data().count || 0;
    } catch {
      const existingSnap = await adminDb.collection('boardApplications').where('emailNormalized', '==', emailNormalized).get();
      existingCount = existingSnap.size;
    }

    const userKey = safeKeyPart(emailNormalized);
    const roleLockKey = `${userKey}__${safeKeyPart(roleKey)}`;
    const limitsRef = adminDb.collection('boardApplicationUserLimits').doc(userKey);
    const roleLockRef = adminDb.collection('boardApplicationUserRoleLocks').doc(roleLockKey);
    const appRef = adminDb.collection('boardApplications').doc();

    await adminDb.runTransaction(async (tx) => {
      const [limitsDoc, roleLockDoc] = await Promise.all([tx.get(limitsRef), tx.get(roleLockRef)]);

      if (roleLockDoc.exists) {
        const existingAppId = (roleLockDoc.data() as any)?.applicationId;
        const msg = existingAppId
          ? 'You have already applied for this position.'
          : 'You have already applied for this position.';
        const err: any = new Error(msg);
        err.status = 409;
        err.code = 'DUPLICATE_ROLE';
        throw err;
      }

      const limits = (limitsDoc.exists ? (limitsDoc.data() as any) : null) as
        | { lastAppliedAtMs?: number; totalApplications?: number }
        | null;
      const lastAppliedAtMs = typeof limits?.lastAppliedAtMs === 'number' ? limits.lastAppliedAtMs : 0;
      const totalApplications =
        typeof limits?.totalApplications === 'number' ? limits.totalApplications : (limitsDoc.exists ? 0 : existingCount);

      const cooldownMs = Math.max(0, cooldownSeconds) * 1000;
      if (cooldownMs > 0 && lastAppliedAtMs && nowMs - lastAppliedAtMs < cooldownMs) {
        const retryAfterMs = cooldownMs - (nowMs - lastAppliedAtMs);
        const retryAfterSeconds = Math.max(1, Math.ceil(retryAfterMs / 1000));
        const err: any = new Error('Too many applications submitted. Please try again in a few moments.');
        err.status = 429;
        err.code = 'RATE_LIMITED';
        err.retryAfterSeconds = retryAfterSeconds;
        throw err;
      }

      if (Number.isFinite(maxTotalApplications) && maxTotalApplications > 0 && totalApplications >= maxTotalApplications) {
        const err: any = new Error(`You have reached the maximum number of applications (${maxTotalApplications}).`);
        err.status = 403;
        err.code = 'MAX_TOTAL_REACHED';
        throw err;
      }

      tx.set(
        limitsRef,
        {
          lastAppliedAtMs: nowMs,
          totalApplications: totalApplications + 1,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      tx.set(roleLockRef, { applicationId: appRef.id, createdAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: false });
      tx.set(appRef, {
        name,
        email,
        emailNormalized,
        role,
        roleId: roleId?.trim() ? roleId.trim() : null,
        phone,
        agree: true,
        coverOption,
        coverText: coverOption === 'text' ? coverText : null,
        coverFile: null,
        cv: null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      } as any);
    });

    let savedCv: { path?: string; url?: string } | null = null;
    let savedCover: { path?: string; url?: string } | null = null;
    try {
      // Save files to storage
      const timestamp = Date.now();
      const cvPath = `board-applications/${timestamp}_${cvFile.name}`;
      savedCv = await saveFileToStorage(cvFile, cvPath);

      if (coverOption === 'file') {
        const coverFile = form.get('coverFile') as File;
        const coverPath = `board-applications/${timestamp}_cover_${coverFile.name}`;
        savedCover = await saveFileToStorage(coverFile, coverPath);
      }

      // Attach file refs to the reserved application doc
      await appRef.set(
        {
          cv: savedCv,
          coverFile: coverOption === 'file' ? savedCover : null,
        },
        { merge: true }
      );
    } catch (uploadErr) {
      // Best-effort rollback to avoid leaving a "reserved" application without files.
      try {
        await adminDb.runTransaction(async (tx) => {
          const limitsDoc = await tx.get(limitsRef);
          const currentTotal = typeof (limitsDoc.data() as any)?.totalApplications === 'number' ? (limitsDoc.data() as any).totalApplications : null;
          if (typeof currentTotal === 'number' && currentTotal > 0) {
            tx.set(limitsRef, { totalApplications: currentTotal - 1, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
          }
          tx.delete(roleLockRef);
          tx.delete(appRef);
        });
      } catch {
        // ignore rollback failures; original error will be returned
      }
      throw uploadErr;
    }

    // Build a JSON-safe response object. Firestore FieldValue (serverTimestamp)
    // is not JSON-serializable, so replace it with an ISO timestamp for the response.
    const responseDoc = {
      id: appRef.id,
      name,
      email,
      role,
      roleId: roleId?.trim() ? roleId.trim() : undefined,
      phone,
      agree: true,
      cv: savedCv || undefined,
      coverOption,
      coverText: coverOption === 'text' ? coverText : null,
      coverFile: coverOption === 'file' ? savedCover : null,
      createdAt: new Date().toISOString(),
    };

    return NextResponse.json(responseDoc);
  } catch (err) {
    const anyErr = err as any;
    const status = typeof anyErr?.status === 'number' ? anyErr.status : 500;
    if (status >= 500) console.error('board-apply POST error', err);
    return NextResponse.json(
      {
        error: anyErr?.message || 'Server error',
        code: anyErr?.code,
        retryAfterSeconds: anyErr?.retryAfterSeconds,
      },
      { status }
    );
  }
}
