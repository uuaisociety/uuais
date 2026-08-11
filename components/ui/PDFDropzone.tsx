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
      <div className="flex items-center gap-3 p-3 rounded-md border border-border bg-card/70">
        <FileText className="h-5 w-5 text-primary shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
          <p className="text-xs text-muted-foreground">
            {(file.size / 1024 / 1024).toFixed(2)} MB · PDF
          </p>
        </div>
        <button
          type="button"
          onClick={() => onChange(null)}
          className="text-sm text-primary hover:underline shrink-0"
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
          ? "border-primary bg-primary/10"
          : "border-border hover:border-border hover:border-foreground/30"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={handleChange}
      />
      <Upload className="h-5 w-5 text-muted-foreground" />
      <div className="text-sm text-muted-foreground">
        Drag & drop your resume here, or{" "}
        <span className="text-primary underline">browse</span>
        <span className="block text-xs text-muted-foreground mt-0.5">PDF, max 3MB</span>
      </div>
    </div>
  );
}
