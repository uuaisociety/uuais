import {
  normalizeNewsUrl,
  isHttpUrl,
  isAllowedImageUrl,
} from '@/lib/ai/blog/url';

describe('normalizeNewsUrl', () => {
  it('lowercases host and path, strips trailing slashes', () => {
    expect(normalizeNewsUrl('https://Example.com/Story/')).toBe(
      'example.com/story',
    );
  });

  it('strips hash and utm tracking params', () => {
    expect(
      normalizeNewsUrl(
        'https://example.com/story?utm_source=x&utm_medium=y&a=1#section',
      ),
    ).toBe('example.com/story');
  });

  it('collapses to host+path, dropping query strings', () => {
    expect(normalizeNewsUrl('https://example.com/?p=1')).toBe('example.com/');
  });

  it('falls back to a trimmed lowercase string for invalid URLs', () => {
    expect(normalizeNewsUrl('not a url')).toBe('not a url');
  });
});

describe('isHttpUrl', () => {
  it('accepts http and https', () => {
    expect(isHttpUrl('https://example.com')).toBe(true);
    expect(isHttpUrl('http://example.com')).toBe(true);
  });

  it('rejects javascript:, data:, ftp and relative links', () => {
    expect(isHttpUrl('javascript:alert(1)')).toBe(false);
    expect(isHttpUrl('data:text/html,hi')).toBe(false);
    expect(isHttpUrl('ftp://example.com/x')).toBe(false);
    expect(isHttpUrl('/relative/path')).toBe(false);
  });
});

// Bucket env vars are read at import (next/jest loads .env), so each case
// loads the module with exactly the env it needs.
const BUCKET_VARS = [
  'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'FIREBASE_STORAGE_BUCKET',
  'GCLOUD_STORAGE_BUCKET',
  'ADMIN_STORAGE_BUCKET',
];
const saved = Object.fromEntries(BUCKET_VARS.map((k) => [k, process.env[k]]));
const loadWithBucket = async (
  bucket?: string,
): Promise<typeof isAllowedImageUrl> => {
  BUCKET_VARS.forEach((k) => delete process.env[k]);
  if (bucket) process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET = bucket;
  jest.resetModules();
  return (await import('@/lib/ai/blog/url')).isAllowedImageUrl;
};
afterAll(() => {
  BUCKET_VARS.forEach((k) =>
    saved[k] === undefined
      ? delete process.env[k]
      : (process.env[k] = saved[k]),
  );
});

describe('isAllowedImageUrl without a configured bucket', () => {
  it('allows hosts next/image is configured to serve', async () => {
    const allowed = await loadWithBucket();
    expect(
      allowed('https://firebasestorage.googleapis.com/v0/b/x/o/img.jpg'),
    ).toBe(true);
    expect(allowed('https://storage.googleapis.com/x/img.jpg')).toBe(true);
  });

  it('rejects other hosts and malformed input', async () => {
    const allowed = await loadWithBucket();
    expect(allowed('https://openai.com/news/og.jpg')).toBe(false);
    expect(allowed('not a url')).toBe(false);
    expect(allowed('')).toBe(false);
  });
});

describe('isAllowedImageUrl with a configured bucket', () => {
  it('allows only the app bucket on storage hosts', async () => {
    const allowed = await loadWithBucket('own.appspot.com');
    expect(
      allowed(
        'https://firebasestorage.googleapis.com/v0/b/own.appspot.com/o/img.jpg',
      ),
    ).toBe(true);
    expect(
      allowed('https://storage.googleapis.com/own.appspot.com/img.jpg'),
    ).toBe(true);
    expect(allowed('https://drive.google.com/uc?id=1')).toBe(true);
    expect(
      allowed('https://firebasestorage.googleapis.com/v0/b/other/o/img.jpg'),
    ).toBe(false);
    expect(allowed('https://storage.googleapis.com/other/img.jpg')).toBe(false);
    expect(
      allowed(
        'https://storage.googleapis.com/own.appspot.com/../other/img.jpg',
      ),
    ).toBe(false);
    expect(
      allowed('https://storage.googleapis.com/own.appspot.com.evil/img.jpg'),
    ).toBe(false);
    expect(
      allowed('http://storage.googleapis.com/own.appspot.com/img.jpg'),
    ).toBe(false);
  });
});
