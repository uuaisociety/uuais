import { matchesImagePattern } from '@/lib/image-hosts';

/** Normalise a URL so the same story surfacing from different sources dedupes. */
export function normalizeNewsUrl(rawUrl: string): string {
  try {
    const url = new URL(rawUrl);
    url.hash = '';
    for (const key of [
      'utm_source',
      'utm_medium',
      'utm_campaign',
      'utm_term',
      'utm_content',
    ]) {
      url.searchParams.delete(key);
    }
    const path = url.pathname.replace(/\/+$/, '') || '/';
    return `${url.hostname.toLowerCase()}${path.toLowerCase()}`;
  } catch {
    return rawUrl.trim().toLowerCase().replace(/\/+$/, '');
  }
}

/** True when the value is an absolute http(s) URL. */
export function isHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

/** True when the URL is one next/image is configured to serve (lib/image-hosts). */
export function isAllowedImageUrl(raw: string): boolean {
  return matchesImagePattern(raw);
}
