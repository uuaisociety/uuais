import type { LucideIcon } from 'lucide-react';
import { ExternalLink, Github, Monitor, Play } from 'lucide-react';
import type { ShowcaseProject } from '@/types';

// External-link safety for user-submitted showcase project URLs. Rendered
// links must never accept script-capable schemes; bare domains get an https
// prefix so "github.com/user/repo" works as a link instead of a relative path.

export function safeExternalUrl(url: string | undefined | null): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  // Reject script-capable schemes outright.
  if (/^javascript:/i.test(trimmed) || /^data:/i.test(trimmed) || /^vbscript:/i.test(trimmed)) return null;
  // Allow http/https as-is.
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  // Bare domain/host (optionally with a path) → normalize to https.
  if (/^[a-z0-9-]+(\.[a-z0-9-]+)+(:[0-9]+)?([/?#].*)?$/i.test(trimmed)) return `https://${trimmed}`;
  return null;
}

/** The single shared read of a project's links, in display order — used by the project page and the card icon links. */
export const linkActions: {
  key: keyof ShowcaseProject['links'];
  icon: LucideIcon;
  label: string;
  hint: string;
}[] = [
  { key: 'github', icon: Github, label: 'Source code', hint: 'Read the repository' },
  { key: 'demo', icon: Monitor, label: 'Live demo', hint: 'Try it in the browser' },
  { key: 'website', icon: ExternalLink, label: 'Website', hint: 'Visit the project site' },
  { key: 'video', icon: Play, label: 'Walkthrough', hint: 'Watch the demo video' },
];
