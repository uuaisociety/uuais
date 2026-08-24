import { ALLOWED_IMAGE_HOSTS } from './defaults';

/** Normalise a URL so the same story surfacing from different sources dedupes. */
export function normalizeNewsUrl(rawUrl: string): string {
  try {
    const url = new URL(rawUrl);
    url.hash = '';
    for (const key of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content']) {
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

/** True when the URL points at a host next/image is configured to serve. */
export function isAllowedImageUrl(raw: string): boolean {
  try {
    return ALLOWED_IMAGE_HOSTS.includes(new URL(raw).hostname);
  } catch {
    return false;
  }
}
