import '@/lib/firebase-admin';
import admin from 'firebase-admin';
import { getStorageBucketName } from '@/lib/image-upload';
import { isUploadedFileRef } from '@/lib/registration-files';
import { isSafeStoragePath } from '@/lib/admin-file-download';

export interface RegistrationFileData {
  userId?: unknown;
  eventId?: unknown;
  registrationData?: Record<string, unknown>;
}

/** Storage paths referenced by a registration, restricted to its own prefix. */
export function collectRegistrationFilePaths(
  data: RegistrationFileData | undefined,
): string[] {
  const eventId = typeof data?.eventId === 'string' ? data.eventId : '';
  const ownerUid = typeof data?.userId === 'string' ? data.userId : '';
  if (!eventId || !ownerUid) return [];
  const prefix = `registrations/${eventId}/${ownerUid}/`;
  return Object.values(data?.registrationData || {})
    .filter(isUploadedFileRef)
    .map((ref) => ref.path)
    .filter((path) => isSafeStoragePath(path, prefix));
}

/** Deletes storage objects, tolerating individual failures. Returns the count deleted. */
export async function deleteStorageFiles(paths: string[]): Promise<number> {
  if (paths.length === 0) return 0;
  const appOptions = admin.app().options as
    { storageBucket?: string } | undefined;
  const bucketName = getStorageBucketName(appOptions);
  const bucket = bucketName
    ? admin.storage().bucket(bucketName)
    : admin.storage().bucket();

  let deleted = 0;
  for (const path of paths) {
    try {
      await bucket.file(path).delete();
      deleted++;
    } catch (err) {
      console.warn('Failed to delete registration file', path, err);
    }
  }
  return deleted;
}

export function deleteRegistrationFilePaths(
  data: RegistrationFileData | undefined,
): Promise<number> {
  return deleteStorageFiles(collectRegistrationFilePaths(data));
}
