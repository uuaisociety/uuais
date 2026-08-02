"use client";

import React, { useState, useRef } from "react";
import { FileText, Upload } from "lucide-react";

const MAX_BYTES = 3 * 1024 * 1024;

interface PDFDropzoneProps {
  file: File | null;
  onChange: (f: File | null) => void;
  onError?: (msg: string) => void;
}

export default function PDFDropzone({ file, onChange, onError }: PDFDropzoneProps) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const accept = (f: File) => {
    if (f.type !== "application/pdf") {
      onError?.("Resume must be a PDF.");
      return;
    }
    if (f.size > MAX_BYTES) {
      onError?.("Resume must be at most 3MB.");
      return;
    }
    onChange(f);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) accept(f);
  };
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) accept(f);
  };

  if (file) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
        <FileText className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{file.name}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {(file.size / 1024 / 1024).toFixed(2)} MB · PDF
          </p>
        </div>
        <button
          type="button"
          onClick={() => onChange(null)}
          className="text-sm text-red-600 dark:text-red-400 hover:underline shrink-0"
        >
          Remove
        </button>
      </div>
    );
  }

  return (
    <div
      onDrop={handleDrop}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onClick={() => inputRef.current?.click()}
      className={`w-full border-2 border-dashed rounded-md p-5 flex items-center justify-center gap-3 cursor-pointer transition-colors duration-200 ${
        dragging
          ? "border-red-500 bg-red-50/50 dark:bg-red-950/20"
          : "border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={handleChange}
      />
      <Upload className="h-5 w-5 text-gray-500 dark:text-gray-400" />
      <div className="text-sm text-gray-600 dark:text-gray-300">
        Drag & drop your resume here, or{" "}
        <span className="text-blue-600 dark:text-blue-400 underline">browse</span>
        <span className="block text-xs text-gray-400 dark:text-gray-500 mt-0.5">PDF, max 3MB</span>
      </div>
    </div>
  );
}
