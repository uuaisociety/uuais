import { ExternalLink, Github, Play, type LucideIcon } from 'lucide-react';
import type { ShowcaseProject } from '@/types';

type LinkKey = 'github' | 'website' | 'demo' | 'video';

const linkActions: { key: LinkKey; icon: LucideIcon; label: string }[] = [
  { key: 'github', icon: Github, label: 'Repository' },
  { key: 'website', icon: ExternalLink, label: 'Website' },
  { key: 'demo', icon: Play, label: 'Live demo' },
  { key: 'video', icon: Play, label: 'Video' },
];

export default function ShowcaseProjectLinks({ links }: { links: ShowcaseProject['links'] }) {
  return (
    <div className="flex items-center gap-0.5">
      {linkActions.map(({ key, icon: Icon, label }) =>
        links[key] ? (
          <a
            key={key}
            href={links[key]}
            aria-label={label}
            title={label}
            target="_blank"
            rel="noreferrer"
            className="grid size-7 place-items-center rounded text-gray-400 transition-colors hover:bg-gray-100 hover:text-red-600 dark:text-gray-500 dark:hover:bg-gray-700 dark:hover:text-red-400"
          >
            <Icon className="size-3.5" />
          </a>
        ) : null,
      )}
    </div>
  );
}
