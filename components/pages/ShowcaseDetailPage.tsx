'use client'

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { notFound, useParams } from 'next/navigation';
import { format } from 'date-fns';
import { ArrowLeft, ArrowUpRight, Check, Link2, RefreshCw, Star, WifiOff } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { useAdmin } from '@/hooks/useAdmin';
import { updatePageMeta } from '@/utils/seo';
import { SHOWCASE_CATEGORY_LABELS, type ShowcaseProject } from '@/types';
import { Card, CardContent } from '@/components/ui/Card';
import Tag from '@/components/ui/Tag';
import { Button } from '@/components/ui/Button';
import ShowcaseCover from '@/components/showcase/ShowcaseCover';
import ShowcaseTag from '@/components/showcase/ShowcaseTag';
import { linkActions, safeExternalUrl } from '@/components/showcase/showcaseLinks';
import { useShowcaseVote } from '@/components/showcase/useShowcaseVote';

const showcaseHref = (p: ShowcaseProject) => `/showcase/${p.slug || p.id}`;

const formatDate = (iso?: string) => {
  const d = iso ? new Date(iso) : null;
  return d && !Number.isNaN(d.getTime()) ? format(d, 'MMMM d, yyyy') : null;
};

interface ShowcaseDetailPageProps {
  /** Firestore id or slug of the project. Falls back to the route param. */
  projectId?: string;
}

const ShowcaseDetailPage: React.FC<ShowcaseDetailPageProps> = ({ projectId }) => {
  const params = useParams<{ id: string }>();
  const id = projectId || params?.id || '';
  const { state } = useApp();
  const { user } = useAdmin();
  const { voted, pending, votesFor, handleVote } = useShowcaseVote(user?.uid);
  const [copied, setCopied] = useState(false);

  const project = useMemo(
    () => state.showcaseProjects.find((p) => (p.slug === id || p.id === id) && p.published),
    [state.showcaseProjects, id],
  );

  useEffect(() => {
    if (project) updatePageMeta(`${project.title} — Showcase`, project.description);
  }, [project]);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(t);
  }, [copied]);

  // Same builder, then shared tags, then category — the strongest link the data supports.
  const related = useMemo(() => {
    if (!project) return [];
    const others = state.showcaseProjects.filter((p) => p.published && p.id !== project.id);
    const score = (p: ShowcaseProject) =>
      (p.creatorUserId === project.creatorUserId ? 100 : 0) +
      (p.tags || []).filter((t) => (project.tags || []).includes(t)).length * 10 +
      (p.category === project.category ? 1 : 0);
    return others
      .map((p) => ({ p, s: score(p) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 3)
      .map((x) => x.p);
  }, [state.showcaseProjects, project]);

  const byCreator = useMemo(() => {
    if (!project) return 0;
    return state.showcaseProjects.filter(
      (p) => p.published && p.creatorUserId === project.creatorUserId,
    ).length;
  }, [state.showcaseProjects, project]);

  // A shared link can arrive before the deferred subscription; wait before calling it a miss.
  if (!state.showcaseLoaded) {
    return (
      <div className="min-h-screen bg-background pt-24 pb-16">
        <div className="mx-auto max-w-5xl px-5 sm:px-8">
          <div className="animate-pulse space-y-6" aria-busy="true" aria-live="polite">
            <div className="h-4 w-32 rounded bg-foreground/[0.06]" />
            <div className="h-72 rounded-xl bg-foreground/[0.06]" />
            <div className="h-8 w-2/3 rounded bg-foreground/[0.06]" />
            <div className="h-4 w-full rounded bg-foreground/[0.04]" />
            <div className="h-4 w-1/2 rounded bg-foreground/[0.04]" />
          </div>
        </div>
      </div>
    );
  }

  // A dropped connection must not report a live, shareable project as gone.
  if (!project && state.showcaseUnavailable) {
    return (
      <div className="min-h-screen bg-background pt-24 pb-16">
        <div className="mx-auto max-w-5xl px-5 sm:px-8">
          <Link
            href="/showcase"
            className="mb-8 inline-flex min-h-9 items-center gap-2 text-sm text-muted-foreground transition-colors duration-300 hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden /> Back to showcase
          </Link>
          <div className="rounded-xl border border-dashed border-border bg-card/50 px-6 py-16 text-center">
            <WifiOff className="mx-auto h-5 w-5 text-muted-foreground" aria-hidden />
            <h1 className="mt-4 text-lg font-semibold tracking-[-0.02em] text-foreground">
              Could not load this project
            </h1>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
              The project could not be reached — usually a dropped connection. The link is fine;
              the page just could not read it.
            </p>
            <Button type="button" variant="outline" onClick={() => window.location.reload()} className="mt-6">
              <RefreshCw className="h-4 w-4" aria-hidden />
              Try again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!project) {
    notFound();
  }

  const hasVoted = voted.includes(project.id);
  const isBusy = pending.includes(project.id);
  const submitted = formatDate(project.createdAt);
  const updated = formatDate(project.updatedAt);
  const availableLinks = linkActions.filter(({ key }) => safeExternalUrl(project.links[key]));
  const paragraphs = (project.details || '')
    .split(/\n{2,}/)
    .map((para) => para.trim())
    .filter(Boolean);

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
    } catch {
      /* clipboard unavailable — the URL is in the address bar */
    }
  };

  return (
    <div className="min-h-screen bg-background transition-colors pb-24">
      <div className="mx-auto max-w-5xl px-5 pt-24 sm:px-8">
        <Link
          href="/showcase"
          className="mb-8 inline-flex min-h-9 items-center gap-2 text-sm text-muted-foreground transition-colors duration-300 hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden /> Back to showcase
        </Link>

        {/* Title block leads, so the project is named before it is pictured. */}
        <div className="mb-8">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="mono-label text-primary">
              {SHOWCASE_CATEGORY_LABELS[project.category]}
            </span>
            {project.featured && <Tag variant="yellow" size="sm">Featured</Tag>}
          </div>
          <h1 className="display-lg break-words">{project.title}</h1>
          <p className="mt-5 max-w-prose break-words text-lg leading-relaxed text-muted-foreground">
            {project.description}
          </p>
        </div>

        {/* Only when there is one: the initials fallback works at card size, but
            at full width it is a 500px empty slab where the artefact should be. */}
        {project.coverImage && (
          <Card variant="glass" className="overflow-hidden">
            <ShowcaseCover
              title={project.title}
              image={project.coverImage}
              className="aspect-[16/9]"
              sizes="(min-width: 1024px) 1024px, 100vw"
              priority
            />
          </Card>
        )}

        <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_16rem] lg:gap-14">
          {/* Main column */}
          <div className="min-w-0">
            {paragraphs.length > 0 ? (
              <section>
                <h2 className="display-md mb-5">
                  <span className="paren">(About)</span> this project
                </h2>
                <div className="max-w-prose space-y-4 break-words leading-relaxed text-muted-foreground">
                  {paragraphs.map((para, i) => (
                    <p key={i}>{para}</p>
                  ))}
                </div>
              </section>
            ) : null}

            {availableLinks.length > 0 && (
              <section className={paragraphs.length > 0 ? 'mt-12' : ''}>
                <h2 className="display-md mb-5">
                  <span className="paren">(See)</span> it yourself
                </h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {availableLinks.map(({ key, icon: Icon, label, hint }) => (
                    <a
                      key={key}
                      href={safeExternalUrl(project.links[key]) as string}
                      target="_blank"
                      rel="noreferrer"
                      className="group flex items-center gap-3 rounded-md border border-border p-4 transition-colors duration-300 hover:border-foreground/25 hover:bg-foreground/[0.03]"
                    >
                      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-foreground">{label}</span>
                        <span className="block text-xs text-muted-foreground">{hint}</span>
                      </span>
                      <ArrowUpRight
                        className="ml-auto h-4 w-4 shrink-0 text-foreground/40 transition-all duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary"
                        aria-hidden
                      />
                    </a>
                  ))}
                </div>
              </section>
            )}

            {(project.tags || []).length > 0 && (
              <section className="mt-12">
                <h3 className="mono-label mb-3 text-muted-foreground">Built with</h3>
                <div className="flex flex-wrap gap-2">
                  {project.tags.map((tag) => (
                    <ShowcaseTag key={tag} tag={tag} />
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Sidebar: the facts, and the two things a reader can do about them. */}
          <aside className="lg:sticky lg:top-20 lg:self-start">
            <div className="rounded-xl border border-border bg-card/70 p-5">
              <dl className="space-y-4">
                <div>
                  <dt className="mono-label text-muted-foreground">Built by</dt>
                  <dd className="mt-1">
                    <Link
                      href={`/showcase?q=${encodeURIComponent(project.creatorName || '')}`}
                      className="block break-words text-sm font-medium text-foreground transition-colors duration-300 hover:text-primary"
                    >
                      {project.creatorName || 'A society member'}
                    </Link>
                    {byCreator > 1 && (
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {byCreator} projects on the showcase
                      </span>
                    )}
                  </dd>
                </div>

                <div>
                  <dt className="mono-label text-muted-foreground">Votes</dt>
                  <dd className="mt-1 font-mono text-2xl font-semibold tabular-nums tracking-[-0.03em] text-foreground">
                    {votesFor(project)}
                  </dd>
                </div>

                {submitted && (
                  <div>
                    <dt className="mono-label text-muted-foreground">Added</dt>
                    <dd className="mt-1 text-sm text-muted-foreground">{submitted}</dd>
                  </div>
                )}

                {updated && updated !== submitted && (
                  <div>
                    <dt className="mono-label text-muted-foreground">Updated</dt>
                    <dd className="mt-1 text-sm text-muted-foreground">{updated}</dd>
                  </div>
                )}
              </dl>

              <div className="mt-6 flex flex-col gap-2 border-t border-border pt-5">
                <Button
                  type="button"
                  onClick={() => handleVote(project)}
                  aria-pressed={hasVoted}
                  disabled={isBusy}
                  variant={hasVoted ? 'outline' : 'default'}
                  className="w-full"
                >
                  <Star className={`h-4 w-4 ${hasVoted ? 'fill-current text-primary' : ''}`} aria-hidden />
                  {hasVoted ? 'Voted — remove' : 'Vote for this project'}
                </Button>
                <Button type="button" variant="outline" onClick={() => void handleShare()} className="w-full">
                  {copied ? <Check className="h-4 w-4" aria-hidden /> : <Link2 className="h-4 w-4" aria-hidden />}
                  {copied ? 'Link copied' : 'Share'}
                </Button>
              </div>

              <p aria-live="polite" className="sr-only">
                {copied ? 'Project link copied to clipboard' : ''}
                {hasVoted ? `Your vote is counted. ${votesFor(project)} votes total.` : ''}
              </p>
            </div>
          </aside>
        </div>

        {related.length > 0 && (
          <section className="mt-20 border-t border-border pt-12">
            <div className="mb-8 flex items-end justify-between gap-6">
              <h2 className="display-md">
                <span className="paren">(Related)</span> projects
              </h2>
              <Link
                href="/showcase"
                className="mono-label hidden shrink-0 text-muted-foreground transition-colors duration-300 hover:text-foreground sm:inline-flex"
              >
                View all
              </Link>
            </div>
            <div className="grid gap-5 sm:grid-cols-3">
              {related.map((p) => (
                <Card key={p.id} variant="glass" hover className="flex h-full flex-col">
                  <Link href={showcaseHref(p)} aria-label={`Open ${p.title}`} className="block">
                    <ShowcaseCover
                      title={p.title}
                      image={p.coverImage}
                      className="aspect-[16/10]"
                      sizes="(min-width: 640px) 33vw, 100vw"
                    />
                  </Link>
                  <CardContent className="flex flex-1 flex-col p-5">
                    <span className="mono-label mb-2 text-primary">
                      {SHOWCASE_CATEGORY_LABELS[p.category]}
                    </span>
                    <h3 className="text-[1.0625rem] font-semibold leading-snug tracking-[-0.02em] break-words">
                      <Link href={showcaseHref(p)} className="transition-colors duration-300 hover:text-primary">
                        {p.title}
                      </Link>
                    </h3>
                    <p className="mt-2 line-clamp-2 break-words text-sm leading-relaxed text-muted-foreground">
                      {p.description}
                    </p>
                    <span className="mono-meta mt-auto truncate pt-4 text-foreground/65">
                      By {p.creatorName || 'member'}
                    </span>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default ShowcaseDetailPage;
