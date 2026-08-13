import { Star } from 'lucide-react';
import type { ShowcaseProject } from '@/types';

export default function VoteButton({
  project,
  voted,
  onVote,
  className = '',
}: {
  project: ShowcaseProject;
  voted: boolean;
  onVote: (p: ShowcaseProject) => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onVote(project)}
      aria-label={voted ? `Voted for ${project.title}` : `Vote for ${project.title}`}
      aria-pressed={voted}
      className={`inline-flex min-h-10 cursor-pointer items-center gap-1 rounded-md border border-border px-3 font-mono text-xs transition-colors hover:border-primary/50 hover:text-primary ${
        voted ? 'text-amber-500 dark:text-amber-400' : 'text-muted-foreground'
      } ${className}`}
    >
      <Star
        className={`size-3 ${voted ? 'fill-amber-500 text-amber-500 dark:fill-amber-400 dark:text-amber-400' : ''}`}
        aria-hidden
      />
      vote
    </button>
  );
}
