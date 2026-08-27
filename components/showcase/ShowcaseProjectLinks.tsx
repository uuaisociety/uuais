import type { ShowcaseProject } from '@/types';
import { linkActions, safeExternalUrl } from '@/components/showcase/showcaseLinks';

/** Capped at two: all four squeezed the byline down to "By Bar…", and the project page lists them all anyway. */
const MAX_ON_CARD = 2;

export default function ShowcaseProjectLinks({
  links,
  title,
}: {
  links: ShowcaseProject['links'];
  title?: string;
}) {
  const available = linkActions
    .map((action) => ({ ...action, href: safeExternalUrl(links[action.key]) }))
    .filter((action) => action.href)
    .slice(0, MAX_ON_CARD);

  return (
    <div className="flex items-center gap-0.5">
      {available.map(({ key, icon: Icon, label, href }) => (
        <a
          key={key}
          href={href as string}
          aria-label={title ? `${label} — ${title}` : label}
          title={label}
          target="_blank"
          rel="noreferrer"
          className="grid size-11 place-items-center rounded-md text-muted-foreground transition-colors duration-300 hover:bg-foreground/[0.05] hover:text-foreground"
        >
          <Icon className="h-4 w-4" aria-hidden />
        </a>
      ))}
    </div>
  );
}
