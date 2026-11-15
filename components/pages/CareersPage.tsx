'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import DOMPurify from 'dompurify';
import { useApp } from '@/contexts/AppContext';
import { Card } from '@/components/ui/Card';
import Tag from '@/components/ui/Tag';
import { Button } from '@/components/ui/Button';
import { Job } from '@/types';
import { incrementJobClick } from '@/lib/firestore/analytics';
import {
  CareersFilters,
  CareersHero,
  COLUMN,
  type FilterValue,
  JOB_CARD,
  JOB_HEAD,
  JOB_LIST,
  JOB_PROSE,
  JOB_ROW,
  JOB_TITLE,
  PAGE,
  PostARole,
  RESULTS,
} from '@/components/pages/CareersLayout';

function JobItem({ job }: { job: Job }) {
  const handleApply = () => {
    incrementJobClick(job.id).catch(() => {});
  };

  return (
    <Card variant="glass" className={JOB_CARD}>
      <div className={JOB_ROW}>
        <div className="flex-1 min-w-0">
          <div className={JOB_HEAD}>
            <h3 className={JOB_TITLE}>{job.title}</h3>
            <div className="flex flex-wrap items-center gap-2">
              <Tag variant="red" size="sm">
                {job.company}
              </Tag>
              {job.location && (
                <Tag variant="green" size="sm">
                  {job.location}
                </Tag>
              )}
              {Array.isArray(job.tags) &&
                job.tags.map((t, i) => (
                  <Tag key={i} variant="yellow" size="sm">
                    {t}
                  </Tag>
                ))}
            </div>
          </div>
          {/<\/?[a-z][\s\S]*>/i.test(job.description || '') ? (
            <div
              className={JOB_PROSE}
              dangerouslySetInnerHTML={{
                __html: DOMPurify.sanitize(job.description || ''),
              }}
            />
          ) : (
            <div className={`${JOB_PROSE} whitespace-pre-wrap`}>
              {job.description}
            </div>
          )}
        </div>
        <div className="flex flex-row sm:flex-col gap-2 items-start sm:items-end shrink-0">
          {job.applyUrl && (
            <Button asChild size="sm" variant="outline">
              <Link
                href={job.applyUrl}
                target="_blank"
                rel="noreferrer"
                onClick={handleApply}
              >
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

  const publishedJobs = useMemo(
    () => state.jobs.filter((j) => j.published),
    [state.jobs],
  );
  const filteredJobs = useMemo(() => {
    switch (filter) {
      case 'startup':
        return publishedJobs.filter((j) => j.type === 'startup');
      case 'internships':
        return publishedJobs.filter(
          (j) => j.type === 'internship' || j.type === 'master_thesis',
        );
      case 'other':
        return publishedJobs.filter((j) => j.type === 'other');
      case 'jobs':
        return publishedJobs.filter((j) => j.type === 'job');
      default:
        return publishedJobs;
    }
  }, [filter, publishedJobs]);

  return (
    <div className={PAGE}>
      <CareersHero />

      <div className={COLUMN}>
        <CareersFilters
          filter={filter}
          onFilterChange={setFilter}
          count={
            filteredJobs.length > 0 &&
            `${filteredJobs.length} role${filteredJobs.length !== 1 ? 's' : ''}`
          }
        />

        {/* Results */}
        <section className={RESULTS} aria-labelledby="open-roles-heading">
          <h2 id="open-roles-heading" className="sr-only">
            Open roles
          </h2>
          {filteredJobs.length === 0 ? (
            <div className="border-t border-border py-16 text-center">
              <p className="mono-meta text-muted-foreground">
                No jobs available right now but stay tuned, new opportunities
                are on the way!
              </p>
            </div>
          ) : (
            <div className={JOB_LIST}>
              {filteredJobs.map((j) => (
                <JobItem key={j.id} job={j} />
              ))}
            </div>
          )}
        </section>

        <PostARole />
      </div>
    </div>
  );
}
