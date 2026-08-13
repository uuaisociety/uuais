'use client'

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Star } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { useAdmin } from '@/hooks/useAdmin';
import { updatePageMeta } from '@/utils/seo';
import { Button } from '@/components/ui/Button';
import { SHOWCASE_CATEGORIES, type ShowcaseCategory } from '@/types';
import ShowcaseCover from '@/components/showcase/ShowcaseCover';
import ShowcaseTag from '@/components/showcase/ShowcaseTag';
import ShowcaseProjectLinks from '@/components/showcase/ShowcaseProjectLinks';
import ShowcaseSubmissionModal from '@/components/showcase/ShowcaseSubmissionModal';
import VoteButton from '@/components/showcase/VoteButton';
import { useShowcaseVote } from '@/components/showcase/useShowcaseVote';

const chipClass = (isActive: boolean) =>
  `inline-flex min-h-10 items-center rounded-md border px-3 font-mono text-xs transition-colors ${
    isActive
      ? 'border-primary bg-primary/10 text-primary'
      : 'border-border text-muted-foreground hover:border-primary/50 hover:text-primary'
  }`;

const ShowcasePage: React.FC = () => {
  const { state } = useApp();
  const { user } = useAdmin();
  const { voted, votesFor, handleVote } = useShowcaseVote(user?.uid);

  const [active, setActive] = useState<ShowcaseCategory | 'all'>('all');
  const [query, setQuery] = useState('');
  const [showSubmit, setShowSubmit] = useState(false);

  useEffect(() => {
    updatePageMeta('Showcase', 'AI projects built by UU AI Society members — from hackathon hacks to research prototypes');
  }, []);

  const published = useMemo(
    () =>
      state.showcaseProjects
        .filter((p) => p.published)
        .sort((a, b) => {
          const ta = new Date(a.createdAt).getTime();
          const tb = new Date(b.createdAt).getTime();
          return (Number.isNaN(tb) ? 0 : tb) - (Number.isNaN(ta) ? 0 : ta);
        }),
    [state.showcaseProjects],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return published.filter(
      (p) =>
        (active === 'all' || p.category === active) &&
        (q === '' ||
          (p.title || '').toLowerCase().includes(q) ||
          (p.description || '').toLowerCase().includes(q) ||
          (p.creatorName || '').toLowerCase().includes(q) ||
          (p.tags || []).some((t) => (t || '').toLowerCase().includes(q))),
    );
  }, [published, active, query]);

  const featured = filtered.filter((p) => p.featured);
  const rest = filtered.filter((p) => !p.featured);

  const formatDate = (iso?: string) => {
    const d = iso ? new Date(iso) : new Date(0);
    return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString();
  };

  return (
    <div className="relative min-h-screen bg-background pt-12 pb-16 [background-image:linear-gradient(to_right,color-mix(in_oklch,var(--foreground)_4%,transparent)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_oklch,var(--foreground)_4%,transparent)_1px,transparent_1px)] [background-size:36px_36px]">
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <div className="flex items-center gap-2 border-b border-border bg-muted px-4 py-2">
            <span className="mono-meta text-muted-foreground">
              <span className="text-primary" aria-hidden>❯</span> ~/uuais/showcase
            </span>
          </div>
          <div className="flex flex-col gap-6 px-6 py-6 sm:px-10 sm:py-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="mono-meta text-muted-foreground sm:text-sm">
                <span className="text-primary" aria-hidden>❯</span> uuais projects --list --sort
                votes
              </p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                <span className="font-mono text-primary" aria-hidden>$</span> Showcase
              </h1>
              <p className="mt-3 text-muted-foreground">
                A gallery of AI projects built by UU AI Society members — from weekend hackathon hacks
                to ongoing research prototypes. All public, all open to fork.
              </p>
            </div>
            <Button
              type="button"
              onClick={() => setShowSubmit(true)}
              className="shrink-0 self-start font-mono lg:self-auto"
            >
              <span className="opacity-80" aria-hidden>❯</span> share your project
            </Button>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setActive('all')}
              aria-pressed={active === 'all'}
              className={`cursor-pointer ${chipClass(active === 'all')}`}
            >
              --all
            </button>
            {SHOWCASE_CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setActive(c)}
                aria-pressed={active === c}
                className={`cursor-pointer ${chipClass(active === c)}`}
              >
                --category {c}
              </button>
            ))}
          </div>
          <div className="relative w-full lg:w-80">
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 font-mono text-sm text-primary" aria-hidden>
              ❯
            </span>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder='grep -i "projects"'
              aria-label="Search projects"
              className="w-full min-h-10 rounded-md border border-border bg-card py-2 pl-8 pr-3 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        <p className="mt-8 mono-meta text-muted-foreground">
          <span aria-hidden>//</span> {filtered.length} projects · {featured.length} featured
        </p>

        {featured.length > 0 && (
          <div className="mt-3 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <div className="flex items-center gap-2 border-b border-border bg-muted px-4 py-2">
              <h2 className="mono-meta text-muted-foreground">
                <span className="text-primary" aria-hidden>##</span> trending projects
              </h2>
              <span className="ml-auto mono-meta text-primary">
                {featured.length} featured
              </span>
            </div>
            <div className="px-5 sm:px-8">
              <div className="divide-y divide-border">
                {featured.map((p) => (
                  <div key={p.id} className="flex flex-col gap-4 py-5 sm:flex-row sm:items-start sm:gap-6">
                    <div className="flex items-center gap-3 sm:w-48 sm:shrink-0 sm:flex-col sm:items-start sm:gap-2">
                      <ShowcaseCover
                        category={p.category}
                        title={p.title}
                        image={p.coverImage}
                        className="size-10 rounded-md"
                        scanlines={false}
                      />
                      <div className="mono-meta text-muted-foreground">
                        <p className="truncate">
                          <Link href={`/showcase/${p.id}`} className="hover:text-primary">
                            <span className="text-primary">{p.category}/</span>
                            {p.id}
                          </Link>
                        </p>
                        <p className="mt-1 flex items-center gap-1">
                          <Star className="size-3 text-amber-500 dark:text-amber-400" aria-hidden />
                          {votesFor(p)} · {formatDate(p.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-lg font-semibold text-foreground">
                        <Link href={`/showcase/${p.id}`} className="hover:text-primary">
                          {p.title}
                        </Link>
                      </h3>
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                        {p.description}
                      </p>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        {(p.tags || []).slice(0, 4).map((tag) => (
                          <ShowcaseTag key={tag} tag={tag} />
                        ))}
                        <VoteButton
                          project={p}
                          voted={voted.includes(p.id)}
                          onVote={handleVote}
                          className="ml-auto"
                        />
                        <ShowcaseProjectLinks links={p.links} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="mt-14 mb-4 flex items-center gap-3">
          <h2 className="font-mono text-sm font-medium text-muted-foreground">
            <span className="text-primary" aria-hidden>#</span> all projects
          </h2>
          <span className="mono-meta text-muted-foreground">({rest.length})</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        {rest.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rest.map((p) => (
              <article
                key={p.id}
                className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all duration-300 hover:border-primary/50 hover:shadow-md dark:hover:border-primary/40"
              >
                <Link href={`/showcase/${p.id}`} className="block">
                  <ShowcaseCover
                    category={p.category}
                    title={p.title}
                    image={p.coverImage}
                    className="aspect-video shrink-0"
                    scanlines={false}
                  />
                </Link>
                <div className="flex flex-1 flex-col p-5">
                  <div className="mb-1.5 flex items-center gap-2">
                    <span className="mono-meta truncate text-muted-foreground">
                      {p.category}/{p.id}
                    </span>
                    <span className="ml-auto flex shrink-0 items-center gap-1 mono-meta text-amber-500 dark:text-amber-400">
                      <Star className="size-3 fill-current" aria-hidden /> {votesFor(p)}
                    </span>
                  </div>
                  <h3 className="truncate text-base font-semibold text-foreground transition-colors group-hover:text-primary">
                    <Link href={`/showcase/${p.id}`} className="block">
                      {p.title}
                    </Link>
                  </h3>
                  <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">
                    {p.description}
                  </p>
                  <div className="mt-auto flex items-center justify-between gap-2 pt-4">
                    <span className="mono-meta truncate text-muted-foreground" title={p.creatorName}>
                      @{p.creatorName || 'member'}
                    </span>
                    <div className="flex shrink-0 items-center gap-1">
                      <VoteButton project={p} voted={voted.includes(p.id)} onVote={handleVote} />
                      <ShowcaseProjectLinks links={p.links} />
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : !state.showcaseLoaded ? (
          <div className="mt-4 grid md:grid-cols-2 lg:grid-cols-3 gap-6" aria-busy="true" aria-live="polite">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="overflow-hidden rounded-xl border border-border bg-card">
                <div className="aspect-video bg-foreground/[0.04] animate-pulse" />
                <div className="p-5 space-y-3">
                  <div className="h-4 w-3/4 rounded bg-foreground/[0.06] animate-pulse" />
                  <div className="h-3 w-full rounded bg-foreground/[0.04] animate-pulse" />
                  <div className="h-3 w-2/3 rounded bg-foreground/[0.04] animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-xl border border-dashed border-border bg-card/50 px-6 py-12 text-center">
            <p className="font-mono text-sm text-muted-foreground">
              <span className="text-primary" aria-hidden>$</span> grep: no matches for{' '}
              <span className="text-primary">
                &quot;{query || `--category ${active}`}&quot;
              </span>
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {published.length === 0
                ? 'No projects yet. Be the first to share what you\'re building.'
                : 'Try a different search term or drop the --category flag.'}
            </p>
          </div>
        )}

        <section className="mt-16 scroll-mt-24 rounded-xl border border-dashed border-border bg-card/60 px-6 py-12 text-center">
          <p className="font-mono text-sm text-foreground/80">
            <span className="text-primary" aria-hidden>$</span> uuais show-and-tell --add-yours
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            Built something cool? Drop a link, add a readme, and ship it to the society showcase. All
            skill levels welcome.
          </p>
          <Button
            type="button"
            onClick={() => setShowSubmit(true)}
            className="mt-6 font-mono"
          >
            <span className="opacity-80" aria-hidden>❯</span> {user ? 'share your project' : 'log in to share your project'}
          </Button>
        </section>

        <ShowcaseSubmissionModal open={showSubmit} onClose={() => setShowSubmit(false)} />
      </div>
    </div>
  );
};

export default ShowcasePage;
