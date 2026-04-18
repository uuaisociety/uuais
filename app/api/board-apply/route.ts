import { NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';
import admin from 'firebase-admin';

export const runtime = 'nodejs';

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

    if (!name || !email) {
      return NextResponse.json({ error: 'Missing name or email' }, { status: 400 });
    }
    if (!role) {
      return NextResponse.json({ error: 'Role is required' }, { status: 400 });
    }
    if (!agree) {
      return NextResponse.json({ error: 'Agreement required' }, { status: 400 });
    }

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

    // Save files to storage
    const timestamp = Date.now();
    const cvPath = `board-applications/${timestamp}_${cvFile.name}`;
    const savedCv = await saveFileToStorage(cvFile, cvPath);

    let savedCover: { path?: string; url?: string } | null = null;
    if (coverOption === 'file') {
      const coverFile = form.get('coverFile') as File;
      const coverPath = `board-applications/${timestamp}_cover_${coverFile.name}`;
      savedCover = await saveFileToStorage(coverFile, coverPath);
    }

    // Persist a document in Firestore
    const doc = {
      name,
      email,
      role,
      phone,
      agree: true,
      cv: savedCv,
      coverOption,
      coverText: coverOption === 'text' ? coverText : null,
      coverFile: coverOption === 'file' ? savedCover : null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const ref = await adminDb.collection('boardApplications').add(doc as any);

    // Build a JSON-safe response object. Firestore FieldValue (serverTimestamp)
    // is not JSON-serializable, so replace it with an ISO timestamp for the response.
    const responseDoc = {
      id: ref.id,
      name,
      email,
      role,
      phone,
      agree: true,
      cv: savedCv,
      coverOption,
      coverText: coverOption === 'text' ? coverText : null,
      coverFile: coverOption === 'file' ? savedCover : null,
      createdAt: new Date().toISOString(),
    };

    return NextResponse.json(responseDoc);
  } catch (err) {
    console.error('board-apply POST error', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
