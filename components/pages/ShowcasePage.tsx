'use client'

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Star } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { useAdmin } from '@/hooks/useAdmin';
import { updatePageMeta } from '@/utils/seo';
import { SHOWCASE_CATEGORIES, type ShowcaseCategory } from '@/types';
import ShowcaseCover from '@/components/showcase/ShowcaseCover';
import ShowcaseTag from '@/components/showcase/ShowcaseTag';
import ShowcaseProjectLinks from '@/components/showcase/ShowcaseProjectLinks';
import ShowcaseSubmissionModal from '@/components/showcase/ShowcaseSubmissionModal';
import { useShowcaseVote } from '@/components/showcase/useShowcaseVote';

const chipClass = (isActive: boolean) =>
  `rounded-md border px-2.5 py-1.5 font-mono text-xs transition-colors ${
    isActive
      ? 'border-red-600 bg-red-600/10 text-red-600 dark:border-red-400 dark:bg-red-400/10 dark:text-red-400'
      : 'border-gray-300 text-gray-600 hover:border-red-600/50 hover:text-red-600 dark:border-gray-700 dark:text-gray-400 dark:hover:border-red-400/50 dark:hover:text-red-400'
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
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [state.showcaseProjects],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return published.filter(
      (p) =>
        (active === 'all' || p.category === active) &&
        (q === '' ||
          p.title.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.creatorName.toLowerCase().includes(q) ||
          p.tags.some((t) => t.toLowerCase().includes(q))),
    );
  }, [published, active, query]);

  const featured = filtered.filter((p) => p.featured);
  const rest = filtered.filter((p) => !p.featured);

  return (
    <div className="relative min-h-screen bg-gray-50 pt-12 pb-16 transition-colors duration-300 [background-image:linear-gradient(to_right,rgba(0,0,0,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.04)_1px,transparent_1px)] [background-size:36px_36px] dark:bg-gray-900 dark:[background-image:linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)]">
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-800/60">
          <div className="flex items-center gap-2 border-b border-gray-200 bg-gray-100 px-4 py-2 dark:border-gray-700/70 dark:bg-gray-800">
            <span className="font-mono text-xs text-gray-500 dark:text-gray-400">
              <span className="text-red-600 dark:text-red-400">❯</span> ~/uuais/showcase
            </span>
          </div>
          <div className="flex flex-col gap-6 px-6 py-6 sm:px-10 sm:py-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="font-mono text-xs text-gray-500 dark:text-gray-400 sm:text-sm">
                <span className="text-red-600 dark:text-red-400">❯</span> uuais projects --list --sort
                votes
              </p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
                <span className="font-mono text-red-600 dark:text-red-400">$</span> Showcase
              </h1>
              <p className="mt-3 text-gray-600 dark:text-gray-300">
                A gallery of AI projects built by UU AI Society members — from weekend hackathon hacks
                to ongoing research prototypes. All public, all open to fork.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowSubmit(true)}
              className="inline-flex shrink-0 cursor-pointer items-center gap-2 self-start rounded-md bg-red-600 px-4 py-2.5 font-mono text-sm text-white shadow-sm transition-colors hover:bg-red-700 lg:self-auto"
            >
              <span className="opacity-80">❯</span> share your project
            </button>
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
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 font-mono text-sm text-red-600 dark:text-red-400">
              ❯
            </span>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder='grep -i "projects"'
              aria-label="Search projects"
              className="w-full rounded-md border border-gray-300 bg-white py-2 pl-8 pr-3 font-mono text-sm text-gray-800 placeholder:text-gray-400 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:placeholder:text-gray-500 dark:focus:border-red-400 dark:focus:ring-red-400"
            />
          </div>
        </div>

        <p className="mt-8 font-mono text-xs text-gray-400 dark:text-gray-600">
          // {filtered.length} projects · {featured.length} featured
        </p>

        {featured.length > 0 && (
          <div className="mt-3 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-800/60">
            <div className="flex items-center gap-2 border-b border-gray-200 bg-gray-100 px-4 py-2 dark:border-gray-700/70 dark:bg-gray-800">
              <span className="font-mono text-xs text-gray-500 dark:text-gray-400">
                <span className="text-red-600 dark:text-red-400">##</span> trending projects
              </span>
              <span className="ml-auto font-mono text-xs text-red-600 dark:text-red-400">
                {featured.length} featured
              </span>
            </div>
            <div className="px-5 sm:px-8">
              <div className="divide-y divide-gray-100 dark:divide-gray-700/60">
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
                      <div className="font-mono text-[11px] leading-4 text-gray-500 dark:text-gray-400">
                        <p className="truncate">
                          <Link href={`/showcase/${p.id}`} className="hover:text-red-600 dark:hover:text-red-400">
                            <span className="text-red-600 dark:text-red-400">{p.category}/</span>
                            {p.id}
                          </Link>
                        </p>
                        <p className="mt-1 flex items-center gap-1">
                          <Star className="size-3 text-amber-500 dark:text-amber-400" />
                          {votesFor(p)} · {new Date(p.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        <Link href={`/showcase/${p.id}`} className="hover:text-red-600 dark:hover:text-red-400">
                          {p.title}
                        </Link>
                      </h3>
                      <p className="mt-1 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                        {p.description}
                      </p>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        {p.tags.slice(0, 4).map((tag) => (
                          <ShowcaseTag key={tag} tag={tag} />
                        ))}
                        <button
                          type="button"
                          onClick={() => handleVote(p)}
                          aria-label={voted.includes(p.id) ? `Voted for ${p.title}` : `Vote for ${p.title}`}
                          aria-pressed={voted.includes(p.id)}
                          className="ml-auto inline-flex cursor-pointer items-center gap-1 rounded-md border border-gray-300 px-2 py-1 font-mono text-xs text-gray-600 transition-colors hover:border-red-600/50 hover:text-red-600 dark:border-gray-700 dark:text-gray-400 dark:hover:border-red-400/50 dark:hover:text-red-400"
                        >
                          <Star
                            className={`size-3 ${voted.includes(p.id) ? 'fill-amber-500 text-amber-500 dark:text-amber-400' : ''}`}
                          />
                          vote
                        </button>
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
          <h2 className="font-mono text-sm font-medium text-gray-700 dark:text-gray-300">
            <span className="text-red-600 dark:text-red-400">#</span> all projects
          </h2>
          <span className="font-mono text-xs text-gray-400 dark:text-gray-600">({rest.length})</span>
          <div className="h-px flex-1 bg-gray-200 dark:bg-gray-800" />
        </div>

        {rest.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rest.map((p) => (
              <article
                key={p.id}
                className="group flex flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition-all duration-300 hover:border-red-600/50 hover:shadow-md dark:border-gray-800 dark:bg-gray-800 dark:hover:border-red-400/40"
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
                    <span className="font-mono text-[11px] text-gray-400 dark:text-gray-600">
                      {p.category}/{p.id}
                    </span>
                    <span className="ml-auto flex shrink-0 items-center gap-1 font-mono text-[11px] text-amber-600 dark:text-amber-400">
                      <Star className="size-3 fill-current" /> {votesFor(p)}
                    </span>
                  </div>
                  <h3 className="truncate text-base font-semibold text-gray-900 transition-colors group-hover:text-red-600 dark:text-white dark:group-hover:text-red-400">
                    <Link href={`/showcase/${p.id}`} className="block">
                      {p.title}
                    </Link>
                  </h3>
                  <p className="mt-1 line-clamp-3 text-sm text-gray-600 dark:text-gray-300">
                    {p.description}
                  </p>
                  <div className="mt-auto flex items-center justify-between pt-4">
                    <span className="font-mono text-[11px] text-gray-500 dark:text-gray-400">
                      @{p.creatorName}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleVote(p)}
                        aria-label={voted.includes(p.id) ? `Voted for ${p.title}` : `Vote for ${p.title}`}
                        aria-pressed={voted.includes(p.id)}
                        className={`inline-flex cursor-pointer items-center gap-1 rounded border border-gray-200 px-2 py-1 font-mono text-[11px] transition-colors hover:border-red-600/50 hover:text-red-600 dark:border-gray-700 dark:hover:border-red-400/50 dark:hover:text-red-400 ${
                          voted.includes(p.id) ? 'text-amber-600 dark:text-amber-400' : 'text-gray-500 dark:text-gray-400'
                        }`}
                      >
                        <Star className={`size-3 ${voted.includes(p.id) ? 'fill-amber-500' : ''}`} /> vote
                      </button>
                      <ShowcaseProjectLinks links={p.links} />
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-lg border border-dashed border-gray-300 bg-white/50 px-6 py-12 text-center dark:border-gray-700 dark:bg-gray-800/40">
            <p className="font-mono text-sm text-gray-600 dark:text-gray-300">
              <span className="text-red-600 dark:text-red-400">$</span> grep: no matches for{' '}
              <span className="text-red-600 dark:text-red-400">
                &quot;{query || `--category ${active}`}&quot;
              </span>
            </p>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {published.length === 0
                ? 'No projects yet. Be the first to share what you\'re building.'
                : 'Try a different search term or drop the --category flag.'}
            </p>
          </div>
        )}

        <section className="mt-16 scroll-mt-24 rounded-lg border border-dashed border-gray-300 bg-white/60 px-6 py-12 text-center dark:border-gray-700 dark:bg-gray-800/40">
          <p className="font-mono text-sm text-gray-700 dark:text-gray-300">
            <span className="text-red-600 dark:text-red-400">$</span> uuais show-and-tell --add-yours
          </p>
          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
            Built something cool? Drop a link, add a readme, and ship it to the society showcase. All
            skill levels welcome.
          </p>
          <button
            type="button"
            onClick={() => setShowSubmit(true)}
            className="mt-6 inline-flex cursor-pointer items-center gap-2 rounded-md bg-red-600 px-4 py-2 font-mono text-sm text-white shadow-sm transition-colors hover:bg-red-700"
          >
            <span className="opacity-80">❯</span> {user ? 'share your project' : 'log in to share your project'}
          </button>
        </section>

        <ShowcaseSubmissionModal open={showSubmit} onClose={() => setShowSubmit(false)} />
      </div>
    </div>
  );
};

export default ShowcasePage;
