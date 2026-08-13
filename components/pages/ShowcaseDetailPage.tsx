'use client'

import React, { useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, ExternalLink, Github, Play, Star } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { useAdmin } from '@/hooks/useAdmin';
import { updatePageMeta } from '@/utils/seo';
import type { ShowcaseProject } from '@/types';
import ShowcaseCover from '@/components/showcase/ShowcaseCover';
import ShowcaseTag from '@/components/showcase/ShowcaseTag';
import { safeExternalUrl } from '@/components/showcase/showcaseLinks';
import { useShowcaseVote } from '@/components/showcase/useShowcaseVote';
import { Button } from '@/components/ui/Button';

const linkActions: { key: keyof ShowcaseProject['links']; icon: React.ElementType; label: string }[] = [
  { key: 'github', icon: Github, label: 'View repository on GitHub' },
  { key: 'website', icon: ExternalLink, label: 'Open website' },
  { key: 'demo', icon: Play, label: 'Try the live demo' },
  { key: 'video', icon: Play, label: 'Watch the video' },
];

const ShowcaseDetailPage: React.FC = () => {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? '';
  const { state } = useApp();
  const { user } = useAdmin();
  const { voted, votesFor, handleVote } = useShowcaseVote(user?.uid);

  const project = useMemo(
    () => state.showcaseProjects.find((p) => p.id === id && p.published),
    [state.showcaseProjects, id],
  );

  useEffect(() => {
    updatePageMeta(project ? `${project.title} — Showcase` : 'Showcase', project?.description || '');
  }, [project]);

  const formatDate = (iso?: string) => {
    const d = iso ? new Date(iso) : new Date(0);
    return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString();
  };

  if (!project) {
    return (
      <div className="min-h-screen bg-background pt-12 pb-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-xl border border-dashed border-border bg-card/50 px-6 py-16 text-center">
            <p className="font-mono text-sm text-muted-foreground">
              <span className="text-primary" aria-hidden>$</span> ls: cannot access &apos;{id || '…'}
              &apos;: no such project
            </p>
            <Link
              href="/showcase"
              className="mt-6 inline-flex min-h-10 items-center gap-2 font-mono text-sm text-primary transition-colors hover:text-primary/80"
            >
              <ArrowLeft className="size-4" aria-hidden /> back to showcase
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-background pt-12 pb-16 [background-image:linear-gradient(to_right,color-mix(in_oklch,var(--foreground)_4%,transparent)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_oklch,var(--foreground)_4%,transparent)_1px,transparent_1px)] [background-size:36px_36px]">
      <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <Link
          href="/showcase"
          className="mb-6 inline-flex min-h-10 items-center gap-2 font-mono text-sm text-muted-foreground transition-colors hover:text-primary"
        >
          <ArrowLeft className="size-4" aria-hidden /> cd ../showcase
        </Link>

        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <div className="flex items-center gap-2 border-b border-border bg-muted px-4 py-2">
            <span className="mono-meta text-muted-foreground">
              <span className="text-primary" aria-hidden>❯</span> ~/uuais/showcase/
              <span className="text-primary">{project.id}</span>
            </span>
          </div>

          <ShowcaseCover
            category={project.category}
            title={project.title}
            image={project.coverImage}
            className="h-52 sm:h-64"
          />

          <div className="px-6 py-8 sm:px-10">
            <div className="flex flex-wrap items-center gap-2 mono-meta text-muted-foreground">
              <span className="rounded-md border border-border bg-muted px-2 py-1">
                <span className="text-primary">{project.category}/</span>
                {project.id}
              </span>
              <span className="flex items-center gap-1">
                <Star className="size-3 text-amber-500 dark:text-amber-400" aria-hidden />
                {votesFor(project)} votes
              </span>
              <span aria-hidden>·</span>
              <span>@{project.creatorName || 'member'}</span>
              <span aria-hidden>·</span>
              <span>{formatDate(project.createdAt)}</span>
            </div>

            <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              <span className="font-mono text-primary" aria-hidden>#</span> {project.title}
            </h1>

            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              {project.description}
            </p>

            {(project.tags || []).length > 0 && (
              <div className="mt-5 flex flex-wrap gap-2">
                {(project.tags || []).map((tag) => (
                  <ShowcaseTag key={tag} tag={tag} />
                ))}
              </div>
            )}

            <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-border pt-6">
              <Button
                type="button"
                onClick={() => handleVote(project)}
                aria-pressed={voted.includes(project.id)}
                disabled={voted.includes(project.id)}
                className="font-mono disabled:cursor-default disabled:opacity-60"
              >
                <Star className={`size-4 ${voted.includes(project.id) ? 'fill-amber-500 text-amber-500 dark:fill-amber-400 dark:text-amber-400' : ''}`} aria-hidden />
                {voted.includes(project.id) ? 'voted ✓' : `star this (${votesFor(project)})`}
              </Button>

              {linkActions.map(({ key, icon: Icon, label }) => {
                const href = safeExternalUrl(project.links[key]);
                if (!href) return null;
                return (
                  <a
                    key={key}
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-10 items-center gap-2 rounded-md border border-border px-4 text-sm text-foreground transition-colors hover:border-primary/50 hover:text-primary"
                  >
                    <Icon className="size-4" aria-hidden /> {label}
                  </a>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShowcaseDetailPage;
