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

export function validateProjectLink(url: string): { ok: true; value: string } | { ok: false; reason: string } {
  const clean = safeExternalUrl(url);
  if (!clean) {
    return { ok: false, reason: 'Use a full http(s) link like https://github.com/…' };
  }
  return { ok: true, value: clean };
}
