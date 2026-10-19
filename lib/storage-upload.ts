import admin from 'firebase-admin';
import '@/lib/firebase-admin';

const SIGNED_URL_TTL_MS = 40 * 24 * 60 * 60 * 1000;

/** Saves a File to Cloud Storage at destPath. Returns the stored path, plus a signed URL when requested. */
export async function saveFileToStorage(
  file: File,
  destPath: string,
  options?: { signedUrl?: boolean },
): Promise<{ path: string; url?: string }> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const bucket = admin.storage().bucket();
  const gfile = bucket.file(destPath);
  await gfile.save(buffer, {
    metadata: { contentType: file.type || 'application/octet-stream' },
  });
  if (!options?.signedUrl) return { path: destPath };
  const [url] = await gfile.getSignedUrl({
    action: 'read',
    expires: Date.now() + SIGNED_URL_TTL_MS,
  });
  return { path: destPath, url };
}
