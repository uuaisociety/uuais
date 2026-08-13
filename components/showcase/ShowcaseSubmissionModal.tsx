'use client'

import React, { useRef, useState } from 'react';
import Link from 'next/link';
import { X, Loader2, ImagePlus, Trash2 } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { useAdmin } from '@/hooks/useAdmin';
import { useNotify } from '@/components/ui/Notifications';
import { FieldGroup, InputBase, SelectBase, TextareaBase } from '@/components/ui/Form';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import ShowcaseCover from '@/components/showcase/ShowcaseCover';
import { safeExternalUrl } from '@/components/showcase/showcaseLinks';
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
    const invalidLink = linkKeys.find((k) => {
      const value = links[k];
      return !!value?.trim() && safeExternalUrl(value) === null;
    });
    if (invalidLink) {
      notify({ type: 'error', title: 'Invalid link', message: `${invalidLink.charAt(0).toUpperCase() + invalidLink.slice(1)} must be a valid http(s) URL.` });
      return;
    }
    const sanitizedLinks = Object.fromEntries(
      linkKeys
        .filter((k) => links[k]?.trim())
        .map((k) => [k, safeExternalUrl(links[k] as string) as string]),
    ) as typeof links;
    setSubmitting(true);
    try {
      const tags = Array.from(
        new Set(tagsText.split(',').map((t) => t.trim().toLowerCase().slice(0, 30)).filter(Boolean)),
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
          links: sanitizedLinks,
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
    <Modal
      open={open}
      onClose={onClose}
      title="Share your project"
      size="md"
      header={
        <div className="flex items-center gap-2 border-b border-border bg-muted px-4 py-3">
          <span className="mono-meta text-muted-foreground">
            <span className="text-primary" aria-hidden>❯</span> ~/uuais/show-and-tell --add-yours
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="ml-auto grid size-9 cursor-pointer place-items-center rounded text-muted-foreground transition-colors hover:bg-foreground/[0.07] hover:text-foreground"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>
      }
      className="p-0"
    >
      {!user ? (
        <div className="px-6 py-12 text-center">
          <p className="font-mono text-sm text-foreground/80">
            <span className="text-primary" aria-hidden>$</span> auth required
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            Log in to share what you&apos;re building with the society.
          </p>
          <Button asChild className="mt-6 font-mono">
            <Link href="/login?redirect=/showcase">
              <span className="opacity-80" aria-hidden>❯</span> log in
            </Link>
          </Button>
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
            <span className="text-xs font-medium text-foreground">
              Cover image<span className="ml-1 text-[11px] font-normal text-muted-foreground">Optional</span>
            </span>
            {cover ? (
              <div className="mt-2 flex items-center gap-3">
                <ShowcaseCover category={category} title={title || 'cover'} image={cover.url} className="h-20 w-32 rounded-md" scanlines={false} />
                <button
                  type="button"
                  onClick={() => void handleRemoveCover()}
                  className="inline-flex min-h-10 cursor-pointer items-center gap-1 rounded-md border border-border px-2.5 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
                >
                  <Trash2 className="size-3" aria-hidden /> remove
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="mt-2 flex w-full min-h-10 cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-border px-4 py-6 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary disabled:opacity-50"
              >
                {uploading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <ImagePlus className="size-4" aria-hidden />}
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

          <div className="mt-6 flex items-center justify-end gap-2 border-t border-border pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
            >
              cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="font-mono disabled:opacity-50"
            >
              {submitting ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <span className="opacity-80" aria-hidden>❯</span>} submit
              for review
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
