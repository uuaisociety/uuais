"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { auth } from "@/lib/firebase-client";
import { Upload, Trash2, FileText, CheckCircle2, AlertTriangle, X, Shield, Loader2 } from "lucide-react";

interface TranscriptEntry {
    rawCourseName: string;
    rawCourseCode?: string;
    credits: number;
    grade?: string;
    domain?: string;
    matchedCourseId: string | null;
    matchConfidence: number;
}

interface TranscriptData {
    entries: TranscriptEntry[];
    summary: {
        totalCredits: number;
        creditsByDomain: Record<string, number>;
    };
}

type Props = {
    onDataLoaded?: (data: TranscriptData) => void;
    onDataDeleted?: () => void;
};

export default function TranscriptUpload({ onDataLoaded, onDataDeleted }: Props) {
    const [isOpen, setIsOpen] = useState(false);
    const [consentGiven, setConsentGiven] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [result, setResult] = useState<TranscriptData | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [hasExistingData, setHasExistingData] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Check if user already has transcript data
    useEffect(() => {
        const checkExisting = async () => {
            const user = auth.currentUser;
            if (!user) return;
            try {
                //const token = await user.getIdToken();
                // We'll check via a simple metadata endpoint (or just try fetching)
                // For now, we can infer from the UI state
            } catch {
                // ignore
            }
        };
        checkExisting();
    }, []);

    const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = e.target.files?.[0];
        if (!selected) return;

        if (selected.type !== 'application/pdf') {
            setError('Only PDF files are accepted');
            return;
        }
        if (selected.size > 5 * 1024 * 1024) {
            setError('File too large (max 5MB)');
            return;
        }

        setFile(selected);
        setError(null);
    }, []);

    const handleUpload = async () => {
        const user = auth.currentUser;
        if (!user || !file || !consentGiven) return;

        setUploading(true);
        setError(null);

        try {
            const token = await user.getIdToken();
            const formData = new FormData();
            formData.append('file', file);
            formData.append('consent', 'true');

            const res = await fetch('/api/transcript/upload', {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: formData,
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({ error: 'Upload failed' }));
                throw new Error(errData.error || 'Upload failed');
            }

            const data = await res.json();
            const transcriptData: TranscriptData = {
                entries: data.entries,
                summary: data.summary,
            };

            setResult(transcriptData);
            setHasExistingData(true);
            onDataLoaded?.(transcriptData);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Upload failed');
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async () => {
        const user = auth.currentUser;
        if (!user) return;
        if (!confirm('Are you sure you want to delete all your transcript data? This cannot be undone.')) return;

        setDeleting(true);
        try {
            const token = await user.getIdToken();
            const res = await fetch('/api/transcript/delete', {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!res.ok) {
                throw new Error('Failed to delete transcript data');
            }

            setResult(null);
            setFile(null);
            setHasExistingData(false);
            setConsentGiven(false);
            onDataDeleted?.();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Delete failed');
        } finally {
            setDeleting(false);
        }
    };

    return (
        <>
            {/* Trigger button */}
            <Button
                variant="outline"
                onClick={() => setIsOpen(true)}
                className="gap-2"
            >
                <Upload className="h-4 w-4" />
                {hasExistingData ? 'Manage Transcript' : 'Upload Transcript'}
            </Button>

            {/* Modal */}
            {isOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                            <div className="flex items-center gap-2">
                                <FileText className="h-5 w-5 text-[#990000]" />
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                    Transcript Upload
                                </h3>
                            </div>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="p-4 space-y-4">
                            {/* Privacy notice */}
                            <div className="flex gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                                <Shield className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                                <div className="text-sm text-blue-800 dark:text-blue-300">
                                    <strong>Privacy First:</strong> Your PDF is processed server-side and <strong>never stored</strong>.
                                    Only extracted course data is saved to your account. You can delete all data at any time with one click.
                                    Your data is never shared with third parties.
                                </div>
                            </div>

                            {/* Results view */}
                            {result ? (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                                        <CheckCircle2 className="h-5 w-5" />
                                        <span className="font-medium">Transcript processed successfully</span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                                            <div className="text-2xl font-bold text-gray-900 dark:text-white">
                                                {result.entries.length}
                                            </div>
                                            <div className="text-xs text-gray-500">Courses found</div>
                                        </div>
                                        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                                            <div className="text-2xl font-bold text-gray-900 dark:text-white">
                                                {result.summary.totalCredits}
                                            </div>
                                            <div className="text-xs text-gray-500">Total credits</div>
                                        </div>
                                    </div>

                                    {/* Matched courses */}
                                    <div>
                                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Matched Courses ({result.entries.filter(e => e.matchedCourseId).length} / {result.entries.length})
                                        </h4>
                                        <div className="max-h-48 overflow-y-auto space-y-1">
                                            {result.entries.map((entry, i) => (
                                                <div
                                                    key={i}
                                                    className={`flex items-center justify-between px-2 py-1 rounded text-sm ${entry.matchedCourseId
                                                            ? 'text-gray-700 dark:text-gray-300'
                                                            : 'text-amber-600 dark:text-amber-400'
                                                        }`}
                                                >
                                                    <span className="truncate flex-1">
                                                        {entry.matchedCourseId ? (
                                                            <CheckCircle2 className="h-3 w-3 inline mr-1 text-green-500" />
                                                        ) : (
                                                            <AlertTriangle className="h-3 w-3 inline mr-1 text-amber-500" />
                                                        )}
                                                        {entry.rawCourseName}
                                                        {entry.rawCourseCode && ` (${entry.rawCourseCode})`}
                                                    </span>
                                                    <span className="text-xs text-gray-500 ml-2 shrink-0">
                                                        {entry.credits} cr
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Delete button */}
                                    <Button
                                        variant="outline"
                                        onClick={handleDelete}
                                        disabled={deleting}
                                        className="w-full text-red-500 border-red-300 hover:bg-red-50 dark:hover:bg-red-900/20"
                                    >
                                        {deleting ? (
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        ) : (
                                            <Trash2 className="h-4 w-4 mr-2" />
                                        )}
                                        Delete All Transcript Data
                                    </Button>
                                </div>
                            ) : (
                                <>
                                    {/* Consent checkbox */}
                                    <label className="flex items-start gap-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={consentGiven}
                                            onChange={(e) => setConsentGiven(e.target.checked)}
                                            className="mt-1 h-4 w-4 rounded border-gray-300 text-[#990000] focus:ring-[#990000]"
                                        />
                                        <span className="text-sm text-gray-700 dark:text-gray-300">
                                            I consent to having my transcript processed to extract course information.
                                            I understand the PDF itself is not stored and I can delete all extracted data at any time.
                                        </span>
                                    </label>

                                    {/* File upload */}
                                    <div
                                        onClick={() => consentGiven && fileInputRef.current?.click()}
                                        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${consentGiven
                                                ? 'border-gray-300 dark:border-gray-600 hover:border-[#990000] cursor-pointer'
                                                : 'border-gray-200 dark:border-gray-700 opacity-50 cursor-not-allowed'
                                            }`}
                                    >
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept="application/pdf"
                                            onChange={handleFileSelect}
                                            className="hidden"
                                            disabled={!consentGiven}
                                        />
                                        <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                                        {file ? (
                                            <div className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                                                {file.name} ({(file.size / 1024).toFixed(0)} KB)
                                            </div>
                                        ) : (
                                            <div className="text-sm text-gray-500">
                                                Drop PDF here or click to browse
                                                <br />
                                                <span className="text-xs">Max 5MB, PDF only</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Error */}
                                    {error && (
                                        <div className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 rounded p-2">
                                            {error}
                                        </div>
                                    )}

                                    {/* Upload button */}
                                    <Button
                                        onClick={handleUpload}
                                        disabled={!file || !consentGiven || uploading}
                                        className="w-full bg-[#990000] hover:bg-[#7f0000] text-white"
                                    >
                                        {uploading ? (
                                            <>
                                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                Processing…
                                            </>
                                        ) : (
                                            <>
                                                <Upload className="h-4 w-4 mr-2" />
                                                Upload & Process
                                            </>
                                        )}
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
