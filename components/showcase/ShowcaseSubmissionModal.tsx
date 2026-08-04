'use client'

import React, { useRef, useState } from 'react';
import Link from 'next/link';
import { X, Loader2, ImagePlus, Trash2 } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { useAdmin } from '@/hooks/useAdmin';
import { useNotify } from '@/components/ui/Notifications';
import { FieldGroup, InputBase, SelectBase, TextareaBase } from '@/components/ui/Form';
import ShowcaseCover from '@/components/showcase/ShowcaseCover';
import { SHOWCASE_CATEGORIES, SHOWCASE_CATEGORY_LABELS, type ShowcaseCategory } from '@/types';
import { getUserProfile } from '@/lib/firestore/users';

type UploadResult = { url: string; path: string };

const linkKeys = ['github', 'website', 'demo', 'video'] as const;

export default function ShowcaseSubmissionModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { dispatch } = useApp();
  const { user, isAdmin } = useAdmin();
  const { notify } = useNotify();
  const fileRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ShowcaseCategory>('other');
  const [links, setLinks] = useState<{ github?: string; website?: string; demo?: string; video?: string }>({});
  const [tagsText, setTagsText] = useState('');
  const [cover, setCover] = useState<UploadResult | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Reset the form whenever the modal transitions from closed to open.
  const [lastOpen, setLastOpen] = useState(open);
  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) {
      setTitle('');
      setDescription('');
      setCategory('other');
      setLinks({});
      setTagsText('');
      setCover(null);
      setSubmitting(false);
      setUploading(false);
    }
  }

  if (!open) return null;

  const handleUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      notify({ type: 'error', title: 'Invalid file', message: 'Only image files are allowed.' });
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      notify({ type: 'error', title: 'File too large', message: 'Cover images must be under 4 MB.' });
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('folder', 'showcase');
      if (cover?.path) fd.append('previousPath', cover.path);
      const res = await fetch('/api/showcase/image', { method: 'POST', body: fd });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        notify({ type: 'error', title: 'Upload failed', message: data.error || 'Please try again.' });
        return;
      }
      const data = (await res.json()) as { url?: string | null; urlPublic?: string | null; path: string };
      setCover({ url: data.urlPublic || data.url || '', path: data.path });
    } catch {
      notify({ type: 'error', title: 'Upload failed', message: 'Please try again.' });
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveCover = async () => {
    if (!cover) return;
    try {
      await fetch('/api/showcase/image', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: cover.path }),
      });
    } catch {
      /* best-effort cleanup */
    }
    setCover(null);
  };

  const handleSubmit = async () => {
    if (!user) return;
    if (!title.trim() || !description.trim()) {
      notify({ type: 'error', title: 'Missing fields', message: 'Title and description are required.' });
      return;
    }
    if (isAdmin) {
      await doSubmit();
      return;
    }
    const profile = await getUserProfile(user.uid).catch(() => null);
    if (!profile || profile.isMember !== true) {
      notify({ type: 'error', title: 'Members only', message: 'Only UU AI Society members can share projects.' });
      return;
    }
    await doSubmit();
  };

  const doSubmit = async () => {
    if (!user) return;
    setSubmitting(true);
    try {
      const tags = Array.from(
        new Set(tagsText.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean)),
      ).slice(0, 5);
      const name = user.displayName || (user as unknown as { name?: string }).name || user.email || 'Member';
      await dispatch({
        firestoreAction: 'ADD_SHOWCASE_PROJECT',
        payload: {
          title: title.trim(),
          description: description.trim(),
          category,
          creatorUserId: user.uid,
          creatorName: name,
          links: Object.fromEntries(linkKeys.filter((k) => links[k]?.trim()).map((k) => [k, links[k]!.trim()])) as typeof links,
          coverImage: cover?.url,
          coverImagePath: cover?.path,
          tags,
          votes: 0,
          published: false,
          featured: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      });
      notify({ type: 'success', title: 'Submitted', message: 'Your project is in review. It will appear here once approved.' });
      onClose();
    } catch {
      notify({ type: 'error', title: 'Submission failed', message: 'Something went wrong. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Share your project"
        className="relative w-full max-w-2xl overflow-hidden rounded-lg bg-white shadow-lg dark:bg-gray-800"
      >
        <div className="flex items-center gap-2 border-b border-gray-200 bg-gray-100 px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
          <span className="font-mono text-xs text-gray-600 dark:text-gray-300">
            <span className="text-red-600 dark:text-red-400">❯</span> ~/uuais/show-and-tell --add-yours
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="ml-auto grid size-7 cursor-pointer place-items-center rounded text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
          >
            <X className="size-4" />
          </button>
        </div>

        {!user ? (
          <div className="px-6 py-12 text-center">
            <p className="font-mono text-sm text-gray-700 dark:text-gray-300">
              <span className="text-red-600 dark:text-red-400">$</span> auth required
            </p>
            <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
              Log in to share what you&apos;re building with the society.
            </p>
            <Link
              href="/login?redirect=/showcase"
              className="mt-6 inline-flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 font-mono text-sm text-white transition-colors hover:bg-red-700"
            >
              <span className="opacity-80">❯</span> log in
            </Link>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleSubmit();
            }}
            className="max-h-[75vh] overflow-y-auto px-6 py-6"
          >
            <div className="grid gap-4 md:grid-cols-2">
              <FieldGroup label="Title" requiredHint="Required.">
                <InputBase value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. HackUppsala Slackbot" maxLength={80} />
              </FieldGroup>
              <FieldGroup label="Category" requiredHint="Required.">
                <SelectBase value={category} onChange={(e) => setCategory(e.target.value as ShowcaseCategory)}>
                  {SHOWCASE_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {SHOWCASE_CATEGORY_LABELS[c]}
                    </option>
                  ))}
                </SelectBase>
              </FieldGroup>
            </div>

            <div className="mt-4">
              <FieldGroup label="Description" requiredHint="Required.">
                <TextareaBase
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What did you build? What problem does it solve? What AI did you use?"
                  rows={3}
                  maxLength={600}
                />
              </FieldGroup>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {linkKeys.map((k) => (
                <FieldGroup key={k} label={k.charAt(0).toUpperCase() + k.slice(1)} requiredHint="Optional">
                  <InputBase
                    value={links[k] || ''}
                    onChange={(e) => setLinks((l) => ({ ...l, [k]: e.target.value }))}
                    placeholder={`https://${k === 'github' ? 'github.com/...' : k === 'website' ? 'your-site.example' : k === 'demo' ? 'demo.example' : 'youtube.com/...'}`}
                  />
                </FieldGroup>
              ))}
            </div>

            <div className="mt-4">
              <FieldGroup label="Tags" requiredHint="Comma-separated, max 5">
                <InputBase
                  value={tagsText}
                  onChange={(e) => setTagsText(e.target.value)}
                  placeholder="llm, hackathon, next.js"
                />
              </FieldGroup>
            </div>

            <div className="mt-4">
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                Cover image<span className="ml-1 text-[11px] font-normal text-gray-500 dark:text-gray-400">Optional</span>
              </span>
              {cover ? (
                <div className="mt-2 flex items-center gap-3">
                  <ShowcaseCover category={category} title={title || 'cover'} image={cover.url} className="h-20 w-32 rounded-md" scanlines={false} />
                  <button
                    type="button"
                    onClick={() => void handleRemoveCover()}
                    className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-gray-300 px-2.5 py-1.5 text-xs text-gray-600 transition-colors hover:border-red-600/50 hover:text-red-600 dark:border-gray-700 dark:text-gray-400 dark:hover:border-red-400/50 dark:hover:text-red-400"
                  >
                    <Trash2 className="size-3" /> remove
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="mt-2 flex w-full cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-gray-300 px-4 py-6 text-sm text-gray-500 transition-colors hover:border-red-600/50 hover:text-red-600 disabled:opacity-50 dark:border-gray-700 dark:text-gray-400 dark:hover:border-red-400/50 dark:hover:text-red-400"
                >
                  {uploading ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
                  {uploading ? 'uploading…' : 'upload a cover image'}
                </button>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleUpload(f);
                  e.target.value = '';
                }}
              />
            </div>

            <div className="mt-6 flex items-center justify-end gap-2 border-t border-gray-100 pt-4 dark:border-gray-700/60">
              <button
                type="button"
                onClick={onClose}
                className="cursor-pointer rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-red-600 px-4 py-2 font-mono text-sm text-white transition-colors hover:bg-red-700 disabled:opacity-50"
              >
                {submitting ? <Loader2 className="size-4 animate-spin" /> : <span className="opacity-80">❯</span>} submit
                for review
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
