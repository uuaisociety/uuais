"use client";

import React, { useEffect, useState, useMemo } from "react";
import DOMPurify from 'dompurify';
import { useApp } from "@/contexts/AppContext";
import { auth } from "@/lib/firebase-client";
import LoginModal from "@/components/ui/LoginModal";
import { Card, CardContent } from "@/components/ui/Card";
import Tag from "@/components/ui/Tag";
import { Button } from "@/components/ui/Button";
import { Job } from "@/types";

function JobItem({ job }: { job: Job }) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{job.title}</h3>
              <Tag variant="red" size="sm">{job.company}</Tag>
              {job.location && <Tag variant="green" size="sm">{job.location}</Tag>}
              {Array.isArray(job.tags) && job.tags.map((t, i) => (
                <Tag key={i} variant="yellow" size="sm">{t}</Tag>
              ))}
            </div>
            {/<\/?[a-z][\s\S]*>/i.test(job.description || '') ? (
              <div
                className="prose prose-lg max-w-none dark:prose-invert prose-headings:text-gray-900 dark:prose-headings:text-white prose-p:text-gray-700 dark:prose-p:text-gray-300"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(job.description || '') }}
              />
            ) : (
              <div className="prose prose-lg max-w-none dark:prose-invert prose-headings:text-gray-900 dark:prose-headings:text-white prose-p:text-gray-700 dark:prose-p:text-gray-300 whitespace-pre-wrap">
                {job.description}
              </div>
            )}
          </div>
          <div className="ml-4 flex flex-col gap-2 items-end">
            {job.applyUrl && (
              <a href={job.applyUrl} target="_blank" rel="noreferrer">
                <Button size="sm" variant="outline">Apply</Button>
              </a>
            )}
            {job.applyEmail && (
              <a href={`mailto:${job.applyEmail}`}>
                {job.applyEmail}
              </a>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function CareersPage() {
  const { state } = useApp();
  const [uid, setUid] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'startup' | 'internships' | 'jobs' | 'other'>('all');

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => {
      setUid(u ? u.uid : null);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const publishedJobs = useMemo(() => state.jobs.filter(j => j.published), [state.jobs]);
  const filteredJobs = useMemo(() => {
    if (filter === 'all') return publishedJobs;
    if (filter === 'startup') return publishedJobs.filter(j => j.type === 'startup');
    if (filter === 'internships') return publishedJobs.filter(j => j.type === 'internship' || j.type === 'master_thesis');
    return publishedJobs.filter(j => j.type === 'job');
  }, [filter, publishedJobs]);

  if (loading) {
    return <div className="pt-24 px-4 max-w-6xl mx-auto text-gray-700 dark:text-gray-200">Loading...</div>;
  }

  if (!uid) {
    return <LoginModal after={() => window.location.assign('/careers')} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-24 pb-12">
      <div className="max-w-6xl mx-auto px-4 space-y-10">
        <header>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Job board</h1>
          <div className="text-gray-700 dark:text-gray-300 space-y-2 mt-2">
            <p>
              At UU AI Society, we connect our members with the industry through relevant opportunities with everything
              from startups to multinationals and everything in between. We post job openings for internships,
              master theses, and full-time roles here.
            </p>
            <p>
              Companies that need the talent offered by our members can post job openings here.
              To post a role here contact us at <a className="underline" href="mailto:alexander.anderson@uuais.com">alexander.anderson@uuais.com</a>.
            </p>
          </div>
        </header>

        {/* Filters */}
        <div className="space-y-3">
          <div className="text-gray-800 dark:text-gray-200 font-medium">Filter</div>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Job filters">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              onClick={() => setFilter('all')}
              aria-pressed={filter === 'all'}
            >
              Show all
            </Button>
            <Button
              variant={filter === 'internships' ? 'default' : 'outline'}
              onClick={() => setFilter('internships')}
              aria-pressed={filter === 'internships'}
            >
              Internships & Master thesis
            </Button>
            <Button
              variant={filter === 'startup' ? 'default' : 'outline'}
              onClick={() => setFilter('startup')}
              aria-pressed={filter === 'startup'}
            >
              Startups
            </Button>
            <Button
              variant={filter === 'jobs' ? 'default' : 'outline'}
              onClick={() => setFilter('jobs')}
              aria-pressed={filter === 'jobs'}
            >
              Jobs
            </Button>
            <Button
              variant={filter === 'other' ? 'default' : 'outline'}
              onClick={() => setFilter('other')}
              aria-pressed={filter === 'other'}
            >
              Other
            </Button>
          </div>
        </div>

        {/* Results */}
        <section className="space-y-4">
          <div className="grid gap-4">
            {filteredJobs.length === 0 ? (
              <div className="text-gray-600 dark:text-gray-300 text-center italic">No jobs available right now but stay tuned, new opportunities are on the way!</div>
            ) : (
              filteredJobs.map(j => <JobItem key={j.id} job={j} />)
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
