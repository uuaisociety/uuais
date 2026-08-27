'use client'

import { Star } from 'lucide-react';
import type { ShowcaseProject } from '@/types';

/** The one card interaction, toggling both ways — a vote you cannot withdraw is a trap. */
export default function VoteButton({
  project,
  votes,
  voted,
  busy = false,
  onVote,
  className = '',
}: {
  project: ShowcaseProject;
  votes: number;
  voted: boolean;
  busy?: boolean;
  onVote: (p: ShowcaseProject) => void;
  className?: string;
}) {
  return (
    <>
      <button
        type="button"
        onClick={() => onVote(project)}
        disabled={busy}
        aria-label={voted ? `Remove your vote for ${project.title}` : `Vote for ${project.title}`}
        aria-pressed={voted}
        className={`group/vote inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-md border px-3 transition-colors duration-300 disabled:cursor-wait disabled:opacity-45 ${
          voted
            ? 'border-primary/30 bg-primary/[0.07] text-primary'
            : 'border-border text-muted-foreground hover:border-foreground/25 hover:text-foreground'
        } ${className}`}
      >
        <Star
          className={`h-3.5 w-3.5 shrink-0 transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${
            voted ? 'fill-current' : 'group-hover/vote:scale-110'
          }`}
          aria-hidden
        />
        {/* Keyed on the value so a change remounts the span and replays the lift —
            no timers, and the motion-reduce variant opts out honestly. */}
        <span
          key={votes}
          className="mono-meta tabular-nums animate-in fade-in slide-in-from-bottom-1 duration-300 motion-reduce:animate-none"
        >
          {votes}
        </span>
      </button>
      <span aria-live="polite" className="sr-only">
        {voted ? `Your vote is counted. ${votes} votes total.` : ''}
      </span>
    </>
  );
}
