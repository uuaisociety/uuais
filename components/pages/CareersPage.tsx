"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import DOMPurify from 'dompurify';
import { useApp } from "@/contexts/AppContext";
import { Card } from "@/components/ui/Card";
import Tag from "@/components/ui/Tag";
import { Button } from "@/components/ui/Button";
import { Job } from "@/types";
import { incrementJobClick } from "@/lib/firestore/analytics";
import HeroSplash from "@/components/HeroSplash";

const FILTERS = [
  { value: 'all', label: 'Show all' },
  { value: 'internships', label: 'Internships & Master thesis' },
  { value: 'startup', label: 'Startups' },
  { value: 'jobs', label: 'Jobs' },
  { value: 'other', label: 'Other' },
] as const;

type FilterValue = (typeof FILTERS)[number]['value'];

function JobItem({ job }: { job: Job }) {
  const handleApply = () => {
    incrementJobClick(job.id).catch(() => {});
  };

  return (
    <Card variant="glass" className="p-5 sm:p-6">
      <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 mb-3">
            <h3 className="text-[1.0625rem] font-semibold tracking-[-0.02em] text-foreground">
              {job.title}
            </h3>
            <div className="flex flex-wrap items-center gap-2">
              <Tag variant="red" size="sm">{job.company}</Tag>
              {job.location && <Tag variant="green" size="sm">{job.location}</Tag>}
              {Array.isArray(job.tags) && job.tags.map((t, i) => (
                <Tag key={i} variant="yellow" size="sm">{t}</Tag>
              ))}
            </div>
          </div>
          {/<\/?[a-z][\s\S]*>/i.test(job.description || '') ? (
            <div
              className="prose prose-lg max-w-none dark:prose-invert prose-headings:text-foreground prose-p:text-muted-foreground break-words"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(job.description || '') }}
            />
          ) : (
            <div className="prose prose-lg max-w-none dark:prose-invert prose-headings:text-foreground prose-p:text-muted-foreground whitespace-pre-wrap break-words">
              {job.description}
            </div>
          )}
        </div>
        <div className="flex flex-row sm:flex-col gap-2 items-start sm:items-end shrink-0">
          {job.applyUrl && (
            <Button asChild size="sm" variant="outline">
              <Link href={job.applyUrl} target="_blank" rel="noreferrer" onClick={handleApply}>
                Read more about this job
              </Link>
            </Button>
          )}
          {job.applyEmail && (
            <a
              href={`mailto:${job.applyEmail}`}
              onClick={handleApply}
              className="mono-meta text-muted-foreground underline underline-offset-4 hover:text-foreground transition-colors duration-300"
            >
              {job.applyEmail}
            </a>
          )}
        </div>
      </div>
    </Card>
  );
}

export default function CareersPage() {
  const { state } = useApp();
  const [filter, setFilter] = useState<FilterValue>('all');

  const publishedJobs = useMemo(() => state.jobs.filter(j => j.published), [state.jobs]);
  const filteredJobs = useMemo(() => {
    switch (filter) {
      case 'startup':
        return publishedJobs.filter(j => j.type === 'startup');
      case 'internships':
        return publishedJobs.filter(j => j.type === 'internship' || j.type === 'master_thesis');
      case 'other':
        return publishedJobs.filter(j => j.type === 'other');
      case 'jobs':
        return publishedJobs.filter(j => j.type === 'job');
      default:
        return publishedJobs;
    }
  }, [filter, publishedJobs]);

  return (
    <div className="min-h-screen bg-background transition-colors pb-24">
      {/* Hero */}
      <HeroSplash>
        <div className="relative z-10 max-w-6xl mx-auto px-6 sm:px-8 pt-32 pb-20">
          <p className="mono-label text-current/65 mb-6">UU AI Society · Job board</p>
          <h1 className="display-lg mb-4">
            Job board
          </h1>
          <p className="text-base sm:text-lg text-current/60 max-w-2xl leading-relaxed">
            Startups, internships, master&apos;s theses, and jobs from the UU AI Society network.
          </p>
        </div>
      </HeroSplash>

      <div className="max-w-6xl mx-auto px-5 sm:px-8 -mt-8">
        {/* Filters */}
        <div className="glass rounded-lg p-5 sm:p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="mono-label text-muted-foreground">Filter by type</p>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Job filters">
              {FILTERS.map((f) => (
                <Button
                  key={f.value}
                  variant={filter === f.value ? 'secondary' : 'outline'}
                  onClick={() => setFilter(f.value)}
                  aria-pressed={filter === f.value}
                >
                  {f.label}
                </Button>
              ))}
            </div>
          </div>
          {filteredJobs.length > 0 && (
            <p className="mono-meta text-muted-foreground">
              {filteredJobs.length} role{filteredJobs.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        {/* Results */}
        <section className="space-y-4 pt-10" aria-labelledby="open-roles-heading">
          <h2 id="open-roles-heading" className="sr-only">Open roles</h2>
          {filteredJobs.length === 0 ? (
            <div className="border-t border-border py-16 text-center">
              <p className="mono-meta text-muted-foreground">
                No jobs available right now but stay tuned, new opportunities are on the way!
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredJobs.map(j => <JobItem key={j.id} job={j} />)}
            </div>
          )}
        </section>

        {/* Post a role */}
        <footer className="pt-12 text-center">
          <p className="mono-meta text-muted-foreground">
            Want to post a role? Contact us at{' '}
            <a
              href="mailto:alexander.andersson@uuais.com"
              className="underline underline-offset-4 hover:text-foreground transition-colors duration-300"
            >
              alexander.andersson@uuais.com
            </a>
          </p>
        </footer>
      </div>
    </div>
  );
}
