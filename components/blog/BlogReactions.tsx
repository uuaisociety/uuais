'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ThumbsUp, ThumbsDown, Share2, Linkedin, Twitter, Link2, Check } from 'lucide-react';
import {
  applyBlogReaction,
  getBlogReactions,
  getStoredReaction,
  incrementBlogShare,
  type BlogReactions as Counts,
  type ReactionDirection,
} from '@/lib/firestore/blog-reactions';
import { useAdmin } from '@/hooks/useAdmin';

interface BlogReactionsProps {
  postId: string;
}

const ZERO: Counts = { likes: 0, dislikes: 0, shares: 0 };

const BlogReactions: React.FC<BlogReactionsProps> = ({ postId }) => {
  const { user } = useAdmin();
  const [counts, setCounts] = useState<Counts>(ZERO);
  const [userChoice, setUserChoice] = useState<ReactionDirection | null>(() => getStoredReaction(postId));
  const [busy, setBusy] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [signInHint, setSignInHint] = useState(false);
  const copiedTimer = useRef<number | null>(null);

  useEffect(() => {
    getBlogReactions(postId).then(setCounts).catch(() => {});
  }, [postId]);

  useEffect(() => () => {
    if (copiedTimer.current !== null) window.clearTimeout(copiedTimer.current);
  }, []);

  // Close the share menu on Escape (hand-rolled popover).
  useEffect(() => {
    if (!shareOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShareOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [shareOpen]);

  const react = useCallback(
    async (direction: ReactionDirection) => {
      // Counter writes are gated to signed-in users in the rules — anonymous localStorage dedup is not a security boundary.
      if (!user) {
        setSignInHint(true);
        return;
      }
      if (busy) return;
      setBusy(true);
      try {
        const result = await applyBlogReaction(postId, direction, userChoice);
        setCounts(result.counts);
        setUserChoice(result.userChoice);
        setSignInHint(false);
      } catch {
        // Rules/offline failure — leave the displayed state as-is.
      } finally {
        setBusy(false);
      }
    },
    [busy, postId, user, userChoice]
  );

  const share = useCallback(
    async (mode: 'linkedin' | 'x' | 'copy') => {
      const url = typeof window !== 'undefined' ? window.location.href : '';
      if (mode === 'linkedin') {
        window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, '_blank', 'noopener,noreferrer');
      } else if (mode === 'x') {
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(typeof document !== 'undefined' ? document.title : '')}&url=${encodeURIComponent(url)}`, '_blank', 'noopener,noreferrer');
      } else {
        try {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          if (copiedTimer.current !== null) window.clearTimeout(copiedTimer.current);
          copiedTimer.current = window.setTimeout(() => setCopied(false), 2000);
        } catch {
          /* clipboard unavailable */
        }
      }
      const counted = await incrementBlogShare(postId).catch(() => false);
      if (counted) setCounts((c) => ({ ...c, shares: c.shares + 1 }));
    },
    [postId]
  );

  const likeActive = userChoice === 'like';
  const dislikeActive = userChoice === 'dislike';

  const shareItem = (mode: 'linkedin' | 'x' | 'copy', icon: React.ReactNode, label: string) => (
    <button
      type="button"
      onClick={() => { share(mode); setShareOpen(false); }}
      className="w-full inline-flex items-center gap-2 px-3 py-2 min-h-11 rounded-md text-sm text-foreground/80 hover:text-foreground hover:bg-foreground/[0.06] transition-colors cursor-pointer"
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div className="flex flex-wrap items-center gap-3">
      {signInHint && (
        <span className="text-xs text-muted-foreground" role="status">
          Sign in to like or dislike articles.
        </span>
      )}
      <div className="flex items-center gap-1 rounded-md border border-border p-1">
        <button
          type="button"
          onClick={() => react('like')}
          disabled={busy}
          aria-pressed={likeActive}
          aria-label="Like this article"
          className={`inline-flex items-center justify-center gap-1.5 min-h-11 min-w-11 px-3 rounded text-sm font-medium transition-colors cursor-pointer disabled:opacity-45 ${
            likeActive
              ? 'bg-primary text-primary-foreground'
              : 'text-foreground/70 hover:bg-foreground/[0.06]'
          }`}
        >
          <ThumbsUp className="h-4 w-4" />
          {counts.likes}
        </button>

        <button
          type="button"
          onClick={() => react('dislike')}
          disabled={busy}
          aria-pressed={dislikeActive}
          aria-label="Dislike this article"
          className={`inline-flex items-center justify-center gap-1.5 min-h-11 min-w-11 px-3 rounded text-sm font-medium transition-colors cursor-pointer disabled:opacity-45 ${
            dislikeActive
              ? 'bg-foreground/[0.12] text-foreground'
              : 'text-foreground/70 hover:bg-foreground/[0.06]'
          }`}
        >
          <ThumbsDown className="h-4 w-4" />
          {counts.dislikes}
        </button>

        <div className="relative">
          <button
            type="button"
            onClick={() => setShareOpen(v => !v)}
            aria-expanded={shareOpen}
            aria-label="Share this article"
            className="inline-flex items-center justify-center gap-1.5 min-h-11 min-w-11 px-3 rounded text-sm font-medium text-foreground/70 hover:bg-foreground/[0.06] transition-colors cursor-pointer"
          >
            <Share2 className="h-4 w-4" />
            {counts.shares}
          </button>

          {shareOpen && (
            <>
              <button
                type="button"
                aria-label="Close share menu"
                className="fixed inset-0 z-20 cursor-default"
                onClick={() => setShareOpen(false)}
                tabIndex={-1}
              />
              <div className="absolute right-0 z-30 mt-2 min-w-44 glass-pop rounded-lg p-1.5 animate-in fade-in-0 zoom-in-95 duration-150">
                {shareItem('linkedin', <Linkedin className="h-4 w-4" aria-hidden />, 'LinkedIn')}
                {shareItem('x', <Twitter className="h-4 w-4" aria-hidden />, 'Post on X')}
                {shareItem('copy', copied ? <Check className="h-4 w-4" aria-hidden /> : <Link2 className="h-4 w-4" aria-hidden />, copied ? 'Copied!' : 'Copy link')}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default BlogReactions;
