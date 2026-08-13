import { ExternalLink, Github, Play, type LucideIcon } from 'lucide-react';
import type { ShowcaseProject } from '@/types';
import { safeExternalUrl } from '@/components/showcase/showcaseLinks';

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
      {linkActions.map(({ key, icon: Icon, label }) => {
        const href = safeExternalUrl(links[key]);
        if (!href) return null;
        return (
          <a
            key={key}
            href={href}
            aria-label={label}
            title={label}
            target="_blank"
            rel="noreferrer"
            className="grid size-9 place-items-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-primary"
          >
            <Icon className="size-3.5" aria-hidden />
          </a>
        );
      })}
    </div>
  );
}
