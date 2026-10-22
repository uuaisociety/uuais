import '@/lib/firebase-admin';
import admin from 'firebase-admin';
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

function storageBucket() {
  return admin.storage().bucket();
}

function isNotFoundError(err: unknown): boolean {
  const e = err as { code?: unknown; statusCode?: unknown; message?: unknown };
  return (
    e?.code === 404 ||
    e?.statusCode === 404 ||
    (typeof e?.message === 'string' && e.message.includes('No such object'))
  );
}

/**
 * Every uploaded file under registrations/{eventId}/{uid}/, discovered from
 * Storage rather than registration documents, so orphaned uploads (failed
 * submissions, old answers) are erased too.
 */
export async function collectUserStorageFilePaths(
  uid: string,
): Promise<string[]> {
  const bucket = storageBucket();
  const prefixes: string[] = [];
  let pageToken: string | undefined;
  do {
    const [, nextQuery, apiResponse] = await bucket.getFiles({
      prefix: 'registrations/',
      delimiter: '/',
      autoPaginate: false,
      ...(pageToken ? { pageToken } : {}),
    });
    const found = (apiResponse as { prefixes?: string[] } | undefined)
      ?.prefixes;
    if (Array.isArray(found)) prefixes.push(...found);
    const nextToken = (nextQuery as { pageToken?: unknown } | undefined)
      ?.pageToken;
    pageToken = typeof nextToken === 'string' ? nextToken : undefined;
  } while (pageToken);

  const paths: string[] = [];
  for (const eventPrefix of prefixes) {
    if (!/^registrations\/[A-Za-z0-9_-]+\/$/.test(eventPrefix)) continue;
    const [files] = await bucket.getFiles({ prefix: `${eventPrefix}${uid}/` });
    for (const file of files) paths.push(file.name);
  }
  return paths;
}

/**
 * Deletes storage objects, tolerating missing objects (already deleted by the
 * retention cron). Returns the count deleted. Pass failOnError to surface
 * non-404 failures so callers can retry instead of leaving files behind.
 */
export async function deleteStorageFiles(
  paths: string[],
  options?: { failOnError?: boolean },
): Promise<number> {
  if (paths.length === 0) return 0;
  const bucket = storageBucket();

  let deleted = 0;
  let firstError: unknown = null;
  for (const path of paths) {
    try {
      await bucket.file(path).delete();
      deleted++;
    } catch (err) {
      if (isNotFoundError(err)) continue;
      console.warn('Failed to delete registration file', path, err);
      firstError = firstError ?? err;
    }
  }
  if (options?.failOnError && firstError) throw firstError;
  return deleted;
}

export function deleteRegistrationFilePaths(
  data: RegistrationFileData | undefined,
): Promise<number> {
  return deleteStorageFiles(collectRegistrationFilePaths(data));
}
