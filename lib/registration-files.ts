import type { UploadedFileRef } from '@/types';

export function isUploadedFileRef(
  value: unknown,
): value is UploadedFileRef & { path: string } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const path = (value as UploadedFileRef).path;
  return typeof path === 'string' && path.length > 0;
}

/** Uploads a member's registration attachment through the server (Storage rules deny client writes). */
export async function uploadRegistrationFile(
  eventId: string,
  file: File,
): Promise<UploadedFileRef> {
  const formData = new FormData();
  formData.set('eventId', eventId);
  formData.set('file', file);
  const res = await fetch('/api/registrations/upload', {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error || `Upload failed (${res.status})`);
  }
  return (await res.json()) as UploadedFileRef;
}

/** Admin-only, same-origin download URL for a stored registration attachment. */
export function registrationFileDownloadUrl(path: string): string {
  return `/api/admin/registrations/file?path=${encodeURIComponent(path)}`;
}

/** Deletes the attachments of one of the caller's registrations (server verifies ownership). */
export async function deleteRegistrationFiles(regId: string): Promise<void> {
  const res = await fetch(
    `/api/registrations/file?regId=${encodeURIComponent(regId)}`,
    { method: 'DELETE' },
  );
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error || `Delete failed (${res.status})`);
  }
}
