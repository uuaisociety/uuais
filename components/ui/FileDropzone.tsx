"use client";

import React, { useCallback, useState } from 'react';
import { useRef } from 'react';
import Image from 'next/image';
import { ImagePlus } from 'lucide-react';

type Props = {
  folder?: string; // storage folder prefix
  // onUploaded returns the download url and the storage fullPath (so callers can persist path)
  onUploaded?: (result: { url: string; path: string }) => void;
  // onFileSelected notifies parent with the selected File so parent can handle upload
  onFileSelected?: (file: File) => void;
  onError?: (err: unknown) => void;
  // optional delete callback; receives a storage path to delete
  onDelete?: (path: string) => Promise<void> | void;
  // UI state props
  uploading?: boolean;
  deleting?: boolean;
  accept?: string; // mime types e.g. 'image/*'
  maxSizeBytes?: number;
  initialUrl?: string;
  initialPath?: string;
};

const FileDropzone: React.FC<Props> = ({ onFileSelected, onError, onDelete, accept = 'image/*', maxSizeBytes = 10_000_000, initialUrl, initialPath, uploading = false, deleting = false }) => {
  const [dragging, setDragging] = useState(false);
  const [preview, setPreview] = useState<string | undefined>(initialUrl);

  // When a file is selected, FileDropzone will show the preview and notify parent via onFileSelected.
  const uploadFile = useCallback((file: File) => {
    // show local preview
    const reader = new FileReader();
    reader.onload = () => setPreview(String(reader.result));
    reader.readAsDataURL(file);
    // notify parent to handle actual upload/back-end interactions
    try {
      onFileSelected?.(file);
    } catch (err) {
      console.error('onFileSelected threw', err);
      onError?.(err);
    }
  }, [onFileSelected, onError]);

  const onDeleteRef = useRef(onDelete);
  onDeleteRef.current = onDelete;

  const handleDelete = useCallback(async (path?: string) => {
    if (!path) return;
    try {
      const cb = onDeleteRef.current;
      if (cb) {
        await cb(path);
        setPreview(undefined);
      } else {
        // No server-side deletion from inside FileDropzone — parent must handle deletion.
        console.warn('No onDelete handler provided; FileDropzone will not perform server-side delete for path:', path);
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
      const human_readable_bytes = Math.round(maxSizeBytes / 1024 / 1024);
      onError?.(new Error('File too large, max size is ' + human_readable_bytes + ' Mb'));
      return;
    }
    // show local preview
    const reader = new FileReader();
    reader.onload = () => setPreview(String(reader.result));
    reader.readAsDataURL(file);
    // notify parent and show preview
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
        className={`w-full border-2 rounded-md p-4 flex items-center justify-center gap-3 ${dragging ? 'border-blue-400 bg-blue-50/20' : 'border-dashed border-gray-300 dark:border-gray-700'} ${uploading || deleting ? 'opacity-60 pointer-events-none' : 'cursor-pointer'}`}
      >
        <div className="flex items-center gap-3">
          <ImagePlus className="h-6 w-6 text-gray-500" />
          <div className="text-sm text-gray-600 dark:text-gray-300">
            {uploading ? 'Uploading...' : deleting ? 'Deleting...' : (
              <>Drop an image here or <label className="text-blue-600 underline cursor-pointer"><input type="file" accept={accept} onChange={handleChange} className="hidden" /> browse</label></>
            )}
          </div>
        </div>
      </div>

      {preview && (
          <div className="mt-3 flex items-center gap-3">
          <div className="relative h-20 w-20 rounded-md overflow-hidden border">
            <Image src={preview} alt="preview" fill style={{ objectFit: 'cover' }} />
          </div>
          <div className="text-sm text-gray-700 dark:text-gray-200">{uploading ? 'Uploading...' : deleting ? 'Deleting...' : 'Preview'}</div>
          {initialPath && (
            <button type="button" className="text-sm text-red-600 underline ml-2" onClick={() => handleDelete(initialPath)} disabled={deleting}>{deleting ? 'Deleting...' : 'Delete file'}</button>
          )}
        </div>
      )}
    </div>
  );
};

export default FileDropzone;
