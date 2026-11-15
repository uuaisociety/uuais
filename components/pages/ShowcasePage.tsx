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
import { Button, buttonVariants } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import Tag from '@/components/ui/Tag';
import HeroSplash from '@/components/HeroSplash';
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
import {
  SkeletonBox,
  SkeletonRegion,
  SkeletonText,
} from '@/components/ui/skeleton';
import { TagBar } from '@/components/ui/TagBar';

// Loaded only when someone opens it — keeps Radix Dialog + the form out of the first-visit bundle.
const ShowcaseSubmissionModal = dynamic(
  () => import('@/components/showcase/ShowcaseSubmissionModal'),
  { ssr: false },
);

type SortKey = 'newest' | 'votes';

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'newest', label: 'Newest' },
  { key: 'votes', label: 'Most voted' },
];

const showcaseHref = (p: ShowcaseProject) => `/showcase/${p.slug || p.id}`;

const time = (iso?: string) => {
  const t = iso ? new Date(iso).getTime() : NaN;
  return Number.isNaN(t) ? 0 : t;
};

// ------------------------------------------------------------------ shared with the skeleton

const PAGE_CLASS = 'min-h-screen bg-background transition-colors pb-24';
const CONTENT_CLASS = 'mx-auto max-w-7xl px-5 sm:px-8';
const TOOLBAR_CLASS =
  'flex flex-col gap-4 pt-10 lg:flex-row lg:items-start lg:justify-between';
const chipClass = (active: boolean) =>
  `inline-flex min-h-9 items-center gap-1.5 rounded-md border px-3 mono-label transition-colors duration-300 ${
    active
      ? 'border-primary/30 bg-primary/[0.07] text-primary'
      : 'border-border text-muted-foreground hover:border-foreground/25 hover:text-foreground'
  }`;
const SORT_GROUP_CLASS =
  'flex items-center gap-1 rounded-md border border-border p-0.5';
const sortClass = (active: boolean) =>
  `inline-flex min-h-9 items-center rounded-sm px-2.5 mono-label transition-colors duration-300 ${
    active
      ? 'bg-foreground/[0.07] text-foreground'
      : 'text-muted-foreground hover:text-foreground'
  }`;
const SEARCH_WRAP_CLASS = 'relative w-full sm:w-64';
const SEARCH_ICON_CLASS =
  'pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground';
const SEARCH_INPUT_CLASS =
  'min-h-10 w-full rounded-md border border-border bg-card py-2 pl-9 pr-3 text-sm';
const LEAD_CLASS = 'mt-10 overflow-hidden';
const LEAD_GRID_CLASS = 'grid md:grid-cols-2';
const LEAD_COVER_CLASS =
  'aspect-[16/10] md:aspect-auto md:h-full md:min-h-[22rem]';
const LEAD_BODY_CLASS = 'flex flex-col justify-center p-6 sm:p-10';
const GRID_CLASS = 'grid gap-5 sm:grid-cols-2 lg:grid-cols-3';
const CARD_CLASS = 'h-full flex flex-col';
const CARD_BODY_CLASS = 'flex flex-1 flex-col p-5';
const CARD_TITLE_CLASS =
  'mb-2 text-[1.0625rem] font-semibold leading-snug tracking-[-0.02em] break-words';
const CARD_EXCERPT_CLASS =
  'mb-4 line-clamp-3 break-words text-sm leading-relaxed text-muted-foreground';
const CARD_FOOTER_CLASS =
  'mt-auto flex items-center justify-between gap-2 border-t border-border pt-4';

export const ShowcaseHero = ({ action }: { action: React.ReactNode }) => (
  <HeroSplash>
    <div className="relative z-10 mx-auto max-w-7xl px-6 pt-32 pb-20 sm:px-8">
      <p className="mono-label text-current/65 mb-6">
        UU AI Society · Built by members
      </p>
      <h1 className="display-lg mb-4">Showcase</h1>
      <p className="max-w-2xl text-base leading-relaxed text-current/65 sm:text-lg">
        AI projects built by members of the society — from weekend hackathon
        builds to ongoing research prototypes. Every project here was made by an
        Uppsala student.
      </p>
      {action}
    </div>
  </HeroSplash>
);

const MoreHead = ({ count }: { count: React.ReactNode }) => (
  <div className="mb-8 flex items-end justify-between gap-6">
    <h2 className="display-md">
      <span className="paren">(More)</span> projects
    </h2>
    <span className="mono-label shrink-0 text-muted-foreground">{count}</span>
  </div>
);

/** The lead project and the card grid while the projects load. */
const ShowcaseContentSkeleton = () => (
  <div aria-hidden>
    <Card variant="glass" className={LEAD_CLASS}>
      <div className={LEAD_GRID_CLASS}>
        <SkeletonBox className={LEAD_COVER_CLASS} />
        <div className={LEAD_BODY_CLASS}>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <SkeletonText className="mono-label" widths={['7rem']} />
          </div>
          <SkeletonText className="display-md mb-3" widths={['70%']} />
          <SkeletonText
            className="mb-6 max-w-prose leading-relaxed"
            lines={3}
          />
          <SkeletonText className="mono-meta" widths={['40%']} />
        </div>
      </div>
    </Card>
    <div className="mt-14">
      <MoreHead count={<SkeletonText widths={['5.5rem']} />} />
      <div className={GRID_CLASS}>
        {[0, 1, 2].map((i) => (
          <Card key={i} variant="glass" className={CARD_CLASS}>
            <SkeletonBox className="aspect-[16/10]" />
            <CardContent className={CARD_BODY_CLASS}>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <SkeletonText className="mono-label" widths={['6rem']} />
              </div>
              <SkeletonText className={CARD_TITLE_CLASS} widths={['75%']} />
              <SkeletonText className={CARD_EXCERPT_CLASS} lines={3} />
              <div className="mb-4 flex flex-wrap gap-2">
                <TagBar size="sm" />
                <TagBar size="sm" />
              </div>
              <div className={CARD_FOOTER_CLASS}>
                <SkeletonText className="mono-meta" widths={['7rem']} />
                {/* The vote button's footprint (min-h-11). */}
                <SkeletonBox className="h-11 w-16 rounded-md" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  </div>
);

/**
 * The showcase before its route has loaded: the real hero and toolbar, with the
 * projects as placeholders. Controls are drawn, not wired; the page brings them.
 */
export const ShowcaseSkeleton = () => (
  <SkeletonRegion label="Loading projects…" className={PAGE_CLASS}>
    <ShowcaseHero
      action={
        <span
          aria-hidden
          className={`${buttonVariants({ variant: 'cta' })} mt-8 pointer-events-none`}
        >
          Share your project
        </span>
      }
    />
    <div className={CONTENT_CLASS}>
      <div aria-hidden className={TOOLBAR_CLASS}>
        <div className="flex flex-wrap gap-2">
          <span className={chipClass(true)}>
            All
            <SkeletonText className="opacity-60" widths={['0.5rem']} />
          </span>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-3">
          <div className={SORT_GROUP_CLASS}>
            {SORTS.map((s) => (
              <span key={s.key} className={sortClass(s.key === 'newest')}>
                {s.label}
              </span>
            ))}
          </div>
          <div className={SEARCH_WRAP_CLASS}>
            <Search className={SEARCH_ICON_CLASS} />
            <span
              className={`${SEARCH_INPUT_CLASS} block text-muted-foreground`}
            >
              Search projects
            </span>
          </div>
        </div>
      </div>
      <ShowcaseContentSkeleton />
    </div>
  </SkeletonRegion>
);

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
              {user ? 'Share your project' : 'Log in to share your project'}
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
