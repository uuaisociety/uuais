'use client'

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Loader2, ImagePlus, Trash2 } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { useAdmin } from '@/hooks/useAdmin';
import { useNotify } from '@/components/ui/Notifications';
import { FieldGroup, InputBase, SelectBase, TextareaBase } from '@/components/ui/Form';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import Tag from '@/components/ui/Tag';
import ShowcaseCover from '@/components/showcase/ShowcaseCover';
import { safeExternalUrl } from '@/components/showcase/showcaseLinks';
import { SHOWCASE_CATEGORIES, SHOWCASE_CATEGORY_LABELS, SHOWCASE_LIMITS, type ShowcaseCategory } from '@/types';
import { getUserProfile } from '@/lib/firestore/users';
import { slugify } from '@/lib/slugify';

type UploadResult = { url: string; path: string };
/** Membership is resolved before the form renders — nobody should fill in a project only to be turned away. */
type Access = 'checking' | 'allowed' | 'not-member';

const linkKeys = ['github', 'website', 'demo', 'video'] as const;

/** The one reading of the tag field: the form previews this and the submit sends it, so nothing is trimmed unseen. */
export function parseTags(text: string): { tags: string[]; tooLong: string[]; overflow: number } {
  const raw = text.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean);
  const unique = Array.from(new Set(raw));
  const tooLong = unique.filter((t) => t.length > SHOWCASE_LIMITS.tag);
  return {
    tags: unique.slice(0, SHOWCASE_LIMITS.tagCount),
    tooLong,
    overflow: Math.max(0, unique.length - SHOWCASE_LIMITS.tagCount),
  };
}

const linkPlaceholder: Record<(typeof linkKeys)[number], string> = {
  github: 'https://github.com/you/project',
  website: 'https://your-project.example',
  demo: 'https://demo.your-project.example',
  video: 'https://youtube.com/watch?v=…',
};

export default function ShowcaseSubmissionModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { dispatch } = useApp();
  const { user, isAdmin } = useAdmin();
  const { notify } = useNotify();
  const fileRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [details, setDetails] = useState('');
  const [category, setCategory] = useState<ShowcaseCategory>('other');
  const [links, setLinks] = useState<{ github?: string; website?: string; demo?: string; video?: string }>({});
  const [tagsText, setTagsText] = useState('');
  const [cover, setCover] = useState<UploadResult | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [memberCheck, setMemberCheck] = useState<Access>('checking');
  // Admins never need the lookup, so their access is derived rather than stored.
  const access: Access = isAdmin ? 'allowed' : memberCheck;

  // Reset the form whenever the modal transitions from closed to open.
  const [lastOpen, setLastOpen] = useState(open);
  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) {
      setTitle('');
      setDescription('');
      setDetails('');
      setCategory('other');
      setLinks({});
      setTagsText('');
      setCover(null);
      setSubmitting(false);
      setUploading(false);
      setMemberCheck('checking');
    }
  }

  // Resolve membership as the modal opens so the rule is stated before any work is asked for.
  useEffect(() => {
    if (!open || !user || isAdmin) return;
    let cancelled = false;
    void getUserProfile(user.uid)
      .then((profile) => {
        if (cancelled) return;
        setMemberCheck(profile?.isMember === true ? 'allowed' : 'not-member');
      })
      .catch(() => {
        if (!cancelled) setMemberCheck('not-member');
      });
    return () => {
      cancelled = true;
    };
  }, [open, user, isAdmin]);

  const parsedTags = parseTags(tagsText);

  // Anything the member would retype, plus a cover already in Storage that nothing would clean up.
  const isDirty =
    Boolean(title || description || details || tagsText || cover) ||
    category !== 'other' ||
    linkKeys.some((key) => Boolean(links[key]));

  // Guarded on real work: prompting over an untouched form trains people to ignore it.
  useEffect(() => {
    if (!open || !isDirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Legacy browsers require a non-empty returnValue to show the prompt.
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [open, isDirty]);

  const deleteCover = async (path: string) => {
    try {
      await fetch('/api/showcase/image', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path }),
      });
    } catch {
      /* best-effort cleanup */
    }
  };

  // Closing without submitting would otherwise strand the uploaded cover in Storage.
  const handleClose = () => {
    if (cover?.path) void deleteCover(cover.path);
    setCover(null);
    onClose();
  };

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
    await deleteCover(cover.path);
    setCover(null);
  };

  const handleSubmit = async () => {
    if (!user || access !== 'allowed') return;
    if (!title.trim() || !description.trim()) {
      notify({ type: 'error', title: 'Missing fields', message: 'Title and description are required.' });
      return;
    }
    const invalidLink = linkKeys.find((k) => {
      const value = links[k];
      return !!value?.trim() && safeExternalUrl(value) === null;
    });
    if (invalidLink) {
      notify({
        type: 'error',
        title: 'Invalid link',
        message: `${invalidLink.charAt(0).toUpperCase() + invalidLink.slice(1)} must be a valid http(s) URL.`,
      });
      return;
    }
    // The member should decide what to cut, not discover the cut after submitting.
    if (parsedTags.tooLong.length > 0) {
      notify({
        type: 'error',
        title: 'Tag too long',
        message: `Tags are limited to ${SHOWCASE_LIMITS.tag} characters. Shorten: ${parsedTags.tooLong.join(', ')}`,
      });
      return;
    }
    if (parsedTags.overflow > 0) {
      notify({
        type: 'error',
        title: 'Too many tags',
        message: `Pick your best ${SHOWCASE_LIMITS.tagCount} — remove ${parsedTags.overflow} more.`,
      });
      return;
    }

    const sanitizedLinks = Object.fromEntries(
      linkKeys
        .filter((k) => links[k]?.trim())
        .map((k) => [k, safeExternalUrl(links[k] as string) as string]),
    ) as typeof links;

    setSubmitting(true);
    try {
      const tags = parsedTags.tags;
      const name = user.displayName || (user as unknown as { name?: string }).name || user.email || 'Member';
      await dispatch({
        firestoreAction: 'ADD_SHOWCASE_PROJECT',
        payload: {
          title: title.trim(),
          // Provisional — a member cannot see others' drafts to check for a clash; approval settles it.
          slug: slugify(title.trim()),
          description: description.trim(),
          ...(details.trim() ? { details: details.trim() } : {}),
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
      notify({
        type: 'success',
        title: 'Submitted for review',
        message: 'The board reviews new projects before they go live. Yours will appear on the showcase once approved.',
      });
      // Submitted successfully, so the cover now belongs to the project.
      setCover(null);
      onClose();
    } catch {
      notify({ type: 'error', title: 'Submission failed', message: 'Something went wrong. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={handleClose} title="Share your project" size="md">
      {!user ? (
        <div className="py-8 text-center">
          <h3 className="text-lg font-semibold tracking-[-0.02em] text-foreground">Log in to share a project</h3>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
            The showcase is built by society members. Log in with your student account to add what you
            have been building.
          </p>
          <Button asChild className="mt-6">
            <Link href="/login?redirect=/showcase">Log in</Link>
          </Button>
        </div>
      ) : access === 'checking' ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground" aria-live="polite">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Checking your membership…
        </div>
      ) : access === 'not-member' ? (
        <div className="py-8 text-center">
          <h3 className="text-lg font-semibold tracking-[-0.02em] text-foreground">Members can share projects</h3>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
            The showcase is for work by UU AI Society members. Membership is open to all Uppsala
            students and takes a minute and then come back and add your project.
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild>
              <Link href="/join">Become a member</Link>
            </Button>
            <Button variant="outline" onClick={handleClose}>
              Not now
            </Button>
          </div>
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleSubmit();
          }}
          className="max-h-[75vh] overflow-y-auto"
        >
          <p className="mb-6 text-sm leading-relaxed text-muted-foreground">
            Projects are reviewed by the board before they go live. Anything you built with AI counts:
            course work, hackathon builds, side projects etc.
          </p>

          <div className="grid gap-4 md:grid-cols-2">
            <FieldGroup label="Title" requiredHint="Required.">
              <InputBase
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. HackUppsala Slackbot"
                maxLength={SHOWCASE_LIMITS.title}
              />
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
                maxLength={SHOWCASE_LIMITS.description}
              />
            </FieldGroup>
          </div>

          <div className="mt-4">
            <FieldGroup
              label="About this project"
              requiredHint="Optional — the longer story, shown on your project page"
            >
              <TextareaBase
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder={'How did it start? What was hard? What would you do differently?\n\nLeave a blank line between paragraphs.'}
                rows={6}
                maxLength={SHOWCASE_LIMITS.details}
              />
            </FieldGroup>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {linkKeys.map((k) => (
              <FieldGroup key={k} label={k.charAt(0).toUpperCase() + k.slice(1)} requiredHint="Optional">
                <InputBase
                  value={links[k] || ''}
                  onChange={(e) => setLinks((l) => ({ ...l, [k]: e.target.value }))}
                  placeholder={linkPlaceholder[k]}
                  maxLength={SHOWCASE_LIMITS.link}
                />
              </FieldGroup>
            ))}
          </div>

          <div className="mt-4">
            <FieldGroup
              label="Tags"
              requiredHint={`Comma-separated, up to ${SHOWCASE_LIMITS.tagCount} · ${SHOWCASE_LIMITS.tag} characters each`}
            >
              <InputBase
                value={tagsText}
                onChange={(e) => setTagsText(e.target.value)}
                placeholder="llm, hackathon, next.js"
                maxLength={(SHOWCASE_LIMITS.tag + 2) * SHOWCASE_LIMITS.tagCount}
                aria-describedby="tags-preview"
              />
            </FieldGroup>
            {/* What will actually be saved, shown before the member commits to it. */}
            <div id="tags-preview" aria-live="polite" className="mt-2">
              {parsedTags.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {parsedTags.tags.map((tag) => (
                    <Tag key={tag} variant="gray" size="sm">{tag}</Tag>
                  ))}
                </div>
              )}
              {(parsedTags.overflow > 0 || parsedTags.tooLong.length > 0) && (
                <p className="mt-2 text-xs leading-relaxed text-primary">
                  {parsedTags.overflow > 0 && (
                    <>
                      {parsedTags.overflow} tag{parsedTags.overflow === 1 ? '' : 's'} over the limit
                      of {SHOWCASE_LIMITS.tagCount}
                      {parsedTags.tooLong.length > 0 && '. '}
                    </>
                  )}
                  {parsedTags.tooLong.length > 0 && (
                    <>
                      {parsedTags.tooLong.length === 1 ? 'One tag is' : `${parsedTags.tooLong.length} tags are`}{' '}
                      longer than {SHOWCASE_LIMITS.tag} characters.
                    </>
                  )}
                </p>
              )}
            </div>
          </div>

          <div className="mt-4">
            <span className="text-xs font-medium text-foreground">
              Cover image
              <span className="ml-1 text-[11px] font-normal text-muted-foreground">Optional</span>
            </span>
            {cover ? (
              <div className="mt-2 flex items-center gap-3">
                <ShowcaseCover
                  title={title || 'Cover'}
                  image={cover.url}
                  className="h-20 w-32 shrink-0 rounded-md"
                  sizes="128px"
                />
                <button
                  type="button"
                  onClick={() => void handleRemoveCover()}
                  className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-md border border-border px-3 text-sm text-muted-foreground transition-colors duration-300 hover:border-foreground/25 hover:text-foreground"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden /> Remove
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="mt-2 flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-border px-4 py-6 text-sm text-muted-foreground transition-colors duration-300 hover:border-foreground/25 hover:text-foreground disabled:opacity-50"
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <ImagePlus className="h-4 w-4" aria-hidden />
                )}
                {uploading ? 'Uploading…' : 'Upload a cover image'}
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

          {/* Pinned: the form is taller than 75vh, so unpinned the only way to reach Submit is to guess it is down there. */}
          <div className="sticky bottom-0 mt-6 flex items-center justify-end gap-2 border-t border-border bg-card pb-1 pt-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || uploading}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              Submit for review
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
