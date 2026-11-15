'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import {
  ArrowUpRight,
  Clock,
  RefreshCw,
  Search,
  Star,
  WifiOff,
  X,
} from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { useAdmin } from '@/hooks/useAdmin';
import { updatePageMeta } from '@/utils/seo';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import Tag from '@/components/ui/Tag';
import {
  SHOWCASE_CATEGORIES,
  SHOWCASE_CATEGORY_LABELS,
  type ShowcaseCategory,
  type ShowcaseProject,
} from '@/types';
import ShowcaseCover from '@/components/showcase/ShowcaseCover';
import ShowcaseTag from '@/components/showcase/ShowcaseTag';
import ShowcaseProjectLinks from '@/components/showcase/ShowcaseProjectLinks';
import VoteButton from '@/components/showcase/VoteButton';
import { useShowcaseVote } from '@/components/showcase/useShowcaseVote';
import { useCollectionData } from '@/lib/firestore/useCollectionData';
import { subscribeToMyShowcaseProjects } from '@/lib/firestore/showcase';
import { SkeletonRegion } from '@/components/ui/skeleton';
import {
  CARD_BODY_CLASS,
  CARD_CLASS,
  CARD_EXCERPT_CLASS,
  CARD_FOOTER_CLASS,
  CARD_TITLE_CLASS,
  chipClass,
  CONTENT_CLASS,
  GRID_CLASS,
  LEAD_BODY_CLASS,
  LEAD_CLASS,
  LEAD_COVER_CLASS,
  LEAD_GRID_CLASS,
  MoreHead,
  PAGE_CLASS,
  SEARCH_ICON_CLASS,
  SEARCH_INPUT_CLASS,
  SEARCH_WRAP_CLASS,
  ShowcaseContentSkeleton,
  ShowcaseHero,
  SORT_GROUP_CLASS,
  sortClass,
  SORTS,
  type SortKey,
  TOOLBAR_CLASS,
} from '@/components/showcase/ShowcaseLayout';

// Loaded only when someone opens it — keeps Radix Dialog + the form out of the first-visit bundle.
const ShowcaseSubmissionModal = dynamic(
  () => import('@/components/showcase/ShowcaseSubmissionModal'),
  { ssr: false },
);

const showcaseHref = (p: ShowcaseProject) => `/showcase/${p.slug || p.id}`;

const time = (iso?: string) => {
  const t = iso ? new Date(iso).getTime() : NaN;
  return Number.isNaN(t) ? 0 : t;
};

const ShowcasePage: React.FC = () => {
  const { state } = useApp();
  const { user } = useAdmin();
  const { voted, pending, votesFor, handleVote } = useShowcaseVote(user?.uid);
  const searchParams = useSearchParams();
  const q = searchParams.get('q') ?? '';

  const [active, setActive] = useState<ShowcaseCategory | 'all'>('all');
  const [query, setQuery] = useState(q);
  const [sort, setSort] = useState<SortKey>('newest');
  const [showSubmit, setShowSubmit] = useState(false);

  useEffect(() => {
    updatePageMeta(
      'Showcase',
      'AI projects built by UU AI Society members — from hackathon builds to research prototypes',
    );
  }, []);

  // Adopt ?q= on navigation, but never sync back in an effect — a two-way sync ping-pongs.
  const [lastQ, setLastQ] = useState(q);
  if (q !== lastQ) {
    setLastQ(q);
    setQuery(q);
  }

  // Written only on a real edit, so the URL stays shareable without driving a re-render.
  const updateQuery = (next: string) => {
    setQuery(next);
    const url = new URL(window.location.href);
    if (next) url.searchParams.set('q', next);
    else url.searchParams.delete('q');
    window.history.replaceState(null, '', url.toString());
  };

  const published = useMemo(
    () => state.showcaseProjects.filter((p) => p.published),
    [state.showcaseProjects],
  );

  // A member's own submissions are invisible in the public feed until approved.
  const { data: mine } = useCollectionData<ShowcaseProject>(
    (cb) => (user ? subscribeToMyShowcaseProjects(user.uid, cb) : () => {}),
    [user?.uid],
  );
  // Gated on `user`: the subscription goes no-op at sign-out but keeps its last result.
  const awaitingReview = useMemo(
    () => (user ? mine.filter((p) => !p.published) : []),
    [mine, user],
  );

  // Category counts drive the filter labels, so an empty filter is visible before it is clicked.
  const counts = useMemo(() => {
    const map = new Map<ShowcaseCategory, number>();
    for (const p of published)
      map.set(p.category, (map.get(p.category) ?? 0) + 1);
    return map;
  }, [published]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const matches = published.filter(
      (p) =>
        (active === 'all' || p.category === active) &&
        (needle === '' ||
          p.title.toLowerCase().includes(needle) ||
          p.description.toLowerCase().includes(needle) ||
          (p.creatorName || '').toLowerCase().includes(needle) ||
          (p.tags || []).some((t) => t.toLowerCase().includes(needle))),
    );
    return [...matches].sort((a, b) =>
      sort === 'votes'
        ? votesFor(b) - votesFor(a) || time(b.createdAt) - time(a.createdAt)
        : time(b.createdAt) - time(a.createdAt),
    );
    // votesFor reads local vote additions; recomputing on `voted` keeps the sort honest after a vote.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [published, active, query, sort, voted]);

  // The lead project gets the hero treatment: featured first, else the top of the current sort.
  const lead = filtered.find((p) => p.featured) ?? filtered[0];
  const rest = lead ? filtered.filter((p) => p.id !== lead.id) : filtered;

  const activeFilterLabel =
    active === 'all' ? null : SHOWCASE_CATEGORY_LABELS[active];

  const renderCard = (p: ShowcaseProject) => (
    <Card key={p.id} variant="glass" hover className={CARD_CLASS}>
      <Link
        href={showcaseHref(p)}
        aria-label={`Open ${p.title}`}
        className="block"
      >
        <ShowcaseCover
          title={p.title}
          image={p.coverImage}
          className="aspect-[16/10]"
        />
      </Link>

      <CardContent className={CARD_BODY_CLASS}>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="mono-label text-primary">
            {SHOWCASE_CATEGORY_LABELS[p.category]}
          </span>
          {p.featured && (
            <Tag variant="yellow" size="sm">
              Featured
            </Tag>
          )}
        </div>

        <h3 className={CARD_TITLE_CLASS}>
          <Link
            href={showcaseHref(p)}
            className="transition-colors duration-300 hover:text-primary"
          >
            {p.title}
          </Link>
        </h3>

        <p className={CARD_EXCERPT_CLASS}>{p.description}</p>

        {(p.tags || []).length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {p.tags.slice(0, 3).map((tag) => (
              <ShowcaseTag key={tag} tag={tag} />
            ))}
          </div>
        )}

        <div className={CARD_FOOTER_CLASS}>
          <Link
            href={`/showcase?q=${encodeURIComponent(p.creatorName || '')}`}
            className="mono-meta min-w-0 truncate text-foreground/65 transition-colors duration-300 hover:text-primary"
            title={`See projects by ${p.creatorName || 'this member'}`}
          >
            By {p.creatorName || 'member'}
          </Link>
          <div className="flex shrink-0 items-center gap-1">
            <ShowcaseProjectLinks links={p.links} title={p.title} />
            <VoteButton
              project={p}
              votes={votesFor(p)}
              voted={voted.includes(p.id)}
              busy={pending.includes(p.id)}
              onVote={handleVote}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className={PAGE_CLASS}>
      <ShowcaseHero
        action={
          <Button
            type="button"
            variant="cta"
            onClick={() => setShowSubmit(true)}
            className="mt-8"
          >
            Share your project
          </Button>
        }
      />

      <div className={CONTENT_CLASS}>
        {/* Toolbar: category filters with live counts, sort, and search */}
        <div className={TOOLBAR_CLASS}>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setActive('all')}
              aria-pressed={active === 'all'}
              className={`${chipClass(active === 'all')} cursor-pointer`}
            >
              All
              <span className="tabular-nums opacity-60">
                {published.length}
              </span>
            </button>
            {SHOWCASE_CATEGORIES.filter((c) => (counts.get(c) ?? 0) > 0).map(
              (c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setActive(c)}
                  aria-pressed={active === c}
                  className={`${chipClass(active === c)} cursor-pointer`}
                >
                  {SHOWCASE_CATEGORY_LABELS[c]}
                  <span className="tabular-nums opacity-60">
                    {counts.get(c)}
                  </span>
                </button>
              ),
            )}
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-3">
            <div className={SORT_GROUP_CLASS}>
              {SORTS.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setSort(s.key)}
                  aria-pressed={sort === s.key}
                  className={`${sortClass(sort === s.key)} cursor-pointer`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            <div className={SEARCH_WRAP_CLASS}>
              <Search className={SEARCH_ICON_CLASS} aria-hidden />
              <input
                type="search"
                value={query}
                onChange={(e) => updateQuery(e.target.value)}
                placeholder="Search projects"
                aria-label="Search projects"
                className={`${SEARCH_INPUT_CLASS} text-foreground transition-colors placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring`}
              />
            </div>
          </div>
        </div>

        {/* Active filter readout */}
        {(query || activeFilterLabel) && (
          <div
            className="mt-4 flex flex-wrap items-center gap-2"
            aria-live="polite"
          >
            <span className="text-sm text-muted-foreground">
              {filtered.length} {filtered.length === 1 ? 'project' : 'projects'}
            </span>
            {query && (
              <button
                type="button"
                onClick={() => updateQuery('')}
                className="inline-flex min-h-8 max-w-[min(20rem,60vw)] cursor-pointer items-center gap-1.5 rounded-md border border-border px-2.5 mono-meta text-muted-foreground transition-colors duration-300 hover:border-foreground/25 hover:text-foreground"
              >
                <span className="truncate">{query}</span>
                <X className="h-3 w-3" aria-hidden />
                <span className="sr-only">Clear search</span>
              </button>
            )}
            {activeFilterLabel && (
              <button
                type="button"
                onClick={() => setActive('all')}
                className="inline-flex min-h-8 cursor-pointer items-center gap-1.5 rounded-md border border-border px-2.5 mono-meta text-muted-foreground transition-colors duration-300 hover:border-foreground/25 hover:text-foreground"
              >
                {activeFilterLabel}
                <X className="h-3 w-3" aria-hidden />
                <span className="sr-only">Clear category filter</span>
              </button>
            )}
          </div>
        )}

        {awaitingReview.length > 0 && (
          <div className="mt-8 rounded-xl border border-border bg-card/70 p-5">
            <div className="flex items-center gap-2">
              <Clock
                className="h-3.5 w-3.5 text-muted-foreground"
                aria-hidden
              />
              <h2 className="mono-label text-muted-foreground">
                Your{' '}
                {awaitingReview.length === 1 ? 'submission' : 'submissions'}
              </h2>
            </div>
            <ul className="mt-3 divide-y divide-border">
              {awaitingReview.map((p) => (
                <li
                  key={p.id}
                  className="flex flex-wrap items-center gap-3 py-2.5"
                >
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                    {p.title}
                  </span>
                  <Tag variant="yellow" size="sm">
                    In review
                  </Tag>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              The board reviews submissions before they go live. Yours appears
              on the showcase as soon as it is approved — no need to submit it
              again.
            </p>
          </div>
        )}

        {!state.showcaseLoaded ? (
          <SkeletonRegion label="Loading projects…">
            <ShowcaseContentSkeleton />
          </SkeletonRegion>
        ) : lead ? (
          <>
            {/* The lead project carries the first viewport — the artefact leads, not the interface. */}
            <Card variant="glass" hover className={LEAD_CLASS}>
              <Link
                href={showcaseHref(lead)}
                aria-label={`Open ${lead.title}`}
                className={LEAD_GRID_CLASS}
              >
                <ShowcaseCover
                  title={lead.title}
                  image={lead.coverImage}
                  className={LEAD_COVER_CLASS}
                  sizes="(min-width: 768px) 50vw, 100vw"
                  priority
                />
                <div className={LEAD_BODY_CLASS}>
                  <div className="mb-4 flex flex-wrap items-center gap-2">
                    <span className="mono-label text-primary">
                      {SHOWCASE_CATEGORY_LABELS[lead.category]}
                    </span>
                    {lead.featured && (
                      <Tag variant="yellow" size="sm">
                        Featured
                      </Tag>
                    )}
                  </div>
                  <h2 className="display-md mb-3 break-words">{lead.title}</h2>
                  <p className="mb-6 max-w-prose break-words leading-relaxed text-muted-foreground">
                    {lead.description}
                  </p>
                  <div className="flex items-center gap-4 mono-meta text-foreground/65">
                    <span className="truncate">
                      By {lead.creatorName || 'member'}
                    </span>
                    <span className="inline-flex items-center gap-1.5 tabular-nums">
                      <Star className="h-3.5 w-3.5" aria-hidden />
                      {votesFor(lead)}
                    </span>
                    <ArrowUpRight
                      className="ml-auto h-4 w-4 shrink-0 text-foreground/60"
                      aria-hidden
                    />
                  </div>
                </div>
              </Link>
            </Card>

            {rest.length > 0 && (
              <div className="mt-14">
                <MoreHead
                  count={`${rest.length} ${rest.length === 1 ? 'project' : 'projects'}`}
                />
                <div className={GRID_CLASS}>{rest.map(renderCard)}</div>
              </div>
            )}
          </>
        ) : state.showcaseUnavailable ? (
          /* An unreachable server is not an empty gallery — "no projects yet" would be a claim we cannot stand behind. */
          <div className="mt-10 rounded-xl border border-dashed border-border bg-card/50 px-6 py-16 text-center">
            <WifiOff
              className="mx-auto h-5 w-5 text-muted-foreground"
              aria-hidden
            />
            <h2 className="mt-4 text-lg font-semibold tracking-[-0.02em] text-foreground">
              Could not load the showcase
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
              The projects could not be reached — usually a dropped connection.
              They are still there; the page just could not read them.
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={() => window.location.reload()}
              className="mt-6"
            >
              <RefreshCw className="h-4 w-4" aria-hidden />
              Try again
            </Button>
          </div>
        ) : (
          <div className="mt-10 rounded-xl border border-dashed border-border bg-card/50 px-6 py-16 text-center">
            <h2 className="text-lg font-semibold tracking-[-0.02em] text-foreground">
              {published.length === 0
                ? 'No projects yet'
                : 'No projects match that search'}
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
              {published.length === 0
                ? 'Be the first to share what you are building — any skill level, any stage.'
                : 'Try a different search term, or clear the filters to see every project.'}
            </p>
            {published.length === 0 ? (
              <Button
                type="button"
                variant="cta"
                onClick={() => setShowSubmit(true)}
                className="mt-6"
              >
                Share your project
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  updateQuery('');
                  setActive('all');
                }}
                className="mt-6"
              >
                Clear filters
              </Button>
            )}
          </div>
        )}

        {/* Closing invitation — the page exists to grow, not just to display. */}
        {published.length > 0 && (
          <section className="mt-20 border-t border-border pt-12 text-center">
            <h2 className="display-md">
              <span className="paren">(Show)</span> and tell
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground">
              Built something with AI this term? A hackathon project, a course
              assignment you are proud of, a weekend experiment — all of it
              belongs here. All skill levels welcome.
            </p>
            <Button
              type="button"
              variant="cta"
              onClick={() => setShowSubmit(true)}
              className="mt-6"
            >
              {user ? 'Share your project' : 'Sign in to share your project'}
            </Button>
          </section>
        )}

        <ShowcaseSubmissionModal
          open={showSubmit}
          onClose={() => setShowSubmit(false)}
        />
      </div>
    </div>
  );
};

export default ShowcasePage;
