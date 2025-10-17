"use client";

import React, { useCallback, useState } from 'react';
import { useRef } from 'react';
import { auth } from '@/lib/firebase-client';
import type { User } from 'firebase/auth';
import Image from 'next/image';
import { ImagePlus } from 'lucide-react';

type Props = {
  folder?: string; // storage folder prefix
  // onUploaded returns the download url and the storage fullPath (so callers can persist path)
  onUploaded?: (result: { url: string; path: string }) => void;
  onError?: (err: unknown) => void;
  // optional delete callback; receives a storage path to delete
  onDelete?: (path: string) => Promise<void> | void;
  accept?: string; // mime types e.g. 'image/*'
  maxSizeBytes?: number;
  initialUrl?: string;
  initialPath?: string;
};

const FileDropzone: React.FC<Props> = ({ folder = 'uploads', onUploaded, onError, onDelete, accept = 'image/*', maxSizeBytes = 5_000_000, initialUrl, initialPath }) => {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | undefined>(initialUrl);

  const uploadFile = useCallback(async (file: File) => {
    try {
      setUploading(true);
      // Server-side upload: send file as form data to our server endpoint.
      const form = new FormData();
      form.append('file', file);
      form.append('folder', folder);
      if (initialPath) form.append('previousPath', initialPath);

      // (do not append idToken to form; we rely on Authorization header)

      // attach ID token if available for server auth
      let token: string | null = null;
      try {
        const user = auth.currentUser;
        if (user) {
          const { getIdToken } = await import('firebase/auth');
          token = await getIdToken(user as User);
        }
      } catch {}

  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  // debug: indicate whether we found a token
  console.debug('FileDropzone: uploading, token present?', Boolean(token));

      const res = await fetch('/api/admin/team-image', { method: 'POST', body: form, headers });
      if (!res.ok) {
        let body = null;
        try { body = await res.json(); } catch {}
        throw new Error(`upload failed${body && body.error ? ': ' + String(body.error) : ''}${body && body.detail ? ' - ' + String(body.detail) : ''}`);
      }
      const data = await res.json();
      const url = data.url || ''; 
      const fullPath = data.path;
      setPreview(() => url || undefined);
      onUploaded?.({ url: url || '', path: fullPath });
    } catch (err) {
      console.error('Upload failed', err);
      onError?.(err);
    } finally {
      setUploading(false);
    }
  }, [folder, onUploaded, onError, initialPath]);

  const onDeleteRef = useRef(onDelete);
  onDeleteRef.current = onDelete;

  const handleDelete = useCallback(async (path?: string) => {
    if (!path) return;
    try {
      // If caller provided onDelete, prefer that (may call server route)
      const cb = onDeleteRef.current;
      if (cb) {
        await cb(path);
      } else {
        // Server-side delete via our endpoint. Attach token if available.
        let token: string | null = null;
  try { const user = auth.currentUser; if (user) { const { getIdToken } = await import('firebase/auth'); token = await getIdToken(user as User); } } catch {}
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        await fetch('/api/admin/team-image', { method: 'DELETE', headers, body: JSON.stringify({ path }) });
      }
    } catch (e) {
      console.error('delete failed', e);
    }
  }, []);

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (accept && !file.type.startsWith(accept.replace('/*', ''))) {
      onError?.(new Error('Invalid file type'));
      return;
    }
    if (file.size > maxSizeBytes) {
      onError?.(new Error('File too large'));
      return;
    }
    // show local preview
    const reader = new FileReader();
    reader.onload = () => setPreview(String(reader.result));
    reader.readAsDataURL(file);
    // upload in background
    uploadFile(file);
  }, [accept, maxSizeBytes, onError, uploadFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
  }, [handleFiles]);

  return (
    <div>
      <div
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        className={`w-full border-2 rounded-md p-4 flex items-center justify-center gap-3 ${dragging ? 'border-blue-400 bg-blue-50/20' : 'border-dashed border-gray-300 dark:border-gray-700'} cursor-pointer`}
      >
        <div className="flex items-center gap-3">
          <ImagePlus className="h-6 w-6 text-gray-500" />
          <div className="text-sm text-gray-600 dark:text-gray-300">Drop an image here or <label className="text-blue-600 underline cursor-pointer"><input type="file" accept={accept} onChange={handleChange} className="hidden" /> browse</label></div>
        </div>
      </div>

      {preview && (
        <div className="mt-3 flex items-center gap-3">
          <div className="relative h-20 w-20 rounded-md overflow-hidden border">
            <Image src={preview} alt="preview" fill style={{ objectFit: 'cover' }} />
          </div>
            <div className="text-sm text-gray-700 dark:text-gray-200">{uploading ? 'Uploading...' : 'Preview'}</div>
            {initialPath && (
              <button type="button" className="text-sm text-red-600 underline ml-2" onClick={() => handleDelete(initialPath)}>Delete file</button>
            )}
        </div>
      )}
    </div>
  );
};

export default FileDropzone;
