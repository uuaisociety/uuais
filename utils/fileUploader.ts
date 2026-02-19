import { auth } from '@/lib/firebase-client';
import type { User } from 'firebase/auth';

export type UploadResult = { url: string | null; path: string };

function defaultRouteForFolder() {
  // Keep legacy default route but allow callers to override route param
  return '/api/admin/team-image';
}

async function getAuthToken(): Promise<string | null> {
  try {
    const { getIdToken } = await import('firebase/auth');
    const user = auth.currentUser as User | null;
    if (user) return await getIdToken(user);
  } catch (e) {
    console.warn('could not get id token', e);
  }
  return null;
}

export async function uploadFileToServer(
  file: File,
  opts?: { folder?: string; previousPath?: string; teamId?: string; route?: string }
): Promise<UploadResult> {
  const form = new FormData();
  form.append('file', file);
  form.append('folder', opts?.folder || 'uploads');
  if (opts?.previousPath) form.append('previousPath', opts.previousPath);
  if (opts?.teamId) form.append('teamId', opts.teamId);

  const token = await getAuthToken();
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const route = opts?.route || defaultRouteForFolder();
  const res = await fetch(route, { method: 'POST', body: form, headers });
  if (!res.ok) {
    let body = null;
    try { body = await res.json(); } catch {
      // Response may not be JSON - ignore and use statusText
    }
    throw new Error(`upload failed: ${body?.error || res.statusText}`);
  }
  const data = await res.json();
  const url = data.urlPublic || data.url || null;
  const path = data.path;
  return { url, path };
}

export async function deleteFileFromServer(path?: string, opts?: { route?: string }): Promise<boolean> {
  if (!path) return false;
  const token = await getAuthToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const route = opts?.route || defaultRouteForFolder();
  const res = await fetch(route, { method: 'DELETE', headers, body: JSON.stringify({ path }) });
  if (!res.ok) {
    let body = null;
    try { body = await res.json(); } catch {
      // Response may not be JSON - ignore and use statusText
    }
    throw new Error(`delete failed: ${body?.error || res.statusText}`);
  }
  return true;
}
