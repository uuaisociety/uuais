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
import { useShowcaseVote } from '@/components/showcase/useShowcaseVote';

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

  if (!project) {
    return (
      <div className="min-h-screen bg-gray-50 pt-12 pb-16 transition-colors duration-300 dark:bg-gray-900">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-lg border border-dashed border-gray-300 bg-white/50 px-6 py-16 text-center dark:border-gray-700 dark:bg-gray-800/40">
            <p className="font-mono text-sm text-gray-600 dark:text-gray-300">
              <span className="text-red-600 dark:text-red-400">$</span> ls: cannot access &apos;{id || '…'}
              &apos;: no such project
            </p>
            <Link
              href="/showcase"
              className="mt-6 inline-flex items-center gap-2 font-mono text-sm text-red-600 transition-colors hover:text-red-700 dark:text-red-400"
            >
              <ArrowLeft className="size-4" /> back to showcase
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-gray-50 pt-12 pb-16 transition-colors duration-300 [background-image:linear-gradient(to_right,rgba(0,0,0,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.04)_1px,transparent_1px)] [background-size:36px_36px] dark:bg-gray-900 dark:[background-image:linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)]">
      <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <Link
          href="/showcase"
          className="mb-6 inline-flex items-center gap-2 font-mono text-sm text-gray-500 transition-colors hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400"
        >
          <ArrowLeft className="size-4" /> cd ../showcase
        </Link>

        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-800/60">
          <div className="flex items-center gap-2 border-b border-gray-200 bg-gray-100 px-4 py-2 dark:border-gray-700/70 dark:bg-gray-800">
            <span className="font-mono text-xs text-gray-500 dark:text-gray-400">
              <span className="text-red-600 dark:text-red-400">❯</span> ~/uuais/showcase/
              <span className="text-red-600 dark:text-red-400">{project.id}</span>
            </span>
          </div>

          <ShowcaseCover
            category={project.category}
            title={project.title}
            image={project.coverImage}
            className="h-52 sm:h-64"
          />

          <div className="px-6 py-8 sm:px-10">
            <div className="flex flex-wrap items-center gap-2 font-mono text-xs text-gray-500 dark:text-gray-400">
              <span className="rounded-md border border-gray-200 bg-gray-100 px-2 py-1 dark:border-gray-700 dark:bg-gray-800">
                <span className="text-red-600 dark:text-red-400">{project.category}/</span>
                {project.id}
              </span>
              <span className="flex items-center gap-1">
                <Star className="size-3 text-amber-500 dark:text-amber-400" />
                {votesFor(project)} votes
              </span>
              <span>·</span>
              <span>@{project.creatorName}</span>
              <span>·</span>
              <span>{new Date(project.createdAt).toLocaleDateString()}</span>
            </div>

            <h1 className="mt-4 text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
              <span className="font-mono text-red-600 dark:text-red-400">#</span> {project.title}
            </h1>

            <p className="mt-4 text-base leading-relaxed text-gray-700 dark:text-gray-300">
              {project.description}
            </p>

            {project.tags.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-2">
                {project.tags.map((tag) => (
                  <ShowcaseTag key={tag} tag={tag} />
                ))}
              </div>
            )}

            <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-gray-100 pt-6 dark:border-gray-700/60">
              <button
                type="button"
                onClick={() => handleVote(project)}
                aria-pressed={voted.includes(project.id)}
                disabled={voted.includes(project.id)}
                className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-red-600 px-4 py-2 font-mono text-sm text-white transition-colors hover:bg-red-700 disabled:cursor-default disabled:opacity-60"
              >
                <Star className={`size-4 ${voted.includes(project.id) ? 'fill-amber-400 text-amber-400' : ''}`} />
                {voted.includes(project.id) ? 'voted ✓' : `star this (${votesFor(project)})`}
              </button>

              {linkActions.map(({ key, icon: Icon, label }) =>
                project.links[key] ? (
                  <a
                    key={key}
                    href={project.links[key]}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 transition-colors hover:border-red-600/50 hover:text-red-600 dark:border-gray-700 dark:text-gray-300 dark:hover:border-red-400/50 dark:hover:text-red-400"
                  >
                    <Icon className="size-4" /> {label}
                  </a>
                ) : null,
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShowcaseDetailPage;
