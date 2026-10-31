// Remote images next/image may serve: the app's own buckets only, so the
// optimizer can't be used as a free proxy for any public bucket. Same env vars
// as the uploaders (lib/image-upload.ts, lib/firebase-client.ts); host-wide
// only if none is set. Shared by next.config.ts and the blog image check.

type ImagePattern = {
  protocol: 'https';
  hostname: string;
  /** Path prefix ending in `/**`, or absent for any path. */
  pathname?: string;
};

const storageBuckets = [
  ...new Set(
    [
      process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      process.env.FIREBASE_STORAGE_BUCKET,
      process.env.GCLOUD_STORAGE_BUCKET,
      process.env.ADMIN_STORAGE_BUCKET,
    ].filter((b): b is string => Boolean(b)),
  ),
];

const storagePatterns: ImagePattern[] = storageBuckets.length
  ? storageBuckets.flatMap((bucket) => [
      {
        protocol: 'https' as const,
        hostname: 'firebasestorage.googleapis.com',
        pathname: `/v0/b/${bucket}/o/**`,
      },
      {
        protocol: 'https' as const,
        hostname: 'storage.googleapis.com',
        pathname: `/${bucket}/**`,
      },
    ])
  : [
      { protocol: 'https', hostname: 'firebasestorage.googleapis.com' },
      { protocol: 'https', hostname: 'storage.googleapis.com' },
    ];

export const IMAGE_REMOTE_PATTERNS: ImagePattern[] = [
  ...storagePatterns,
  { protocol: 'https', hostname: 'drive.google.com' },
];

/** True when next/image is configured to serve this absolute URL. */
export function matchesImagePattern(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  return IMAGE_REMOTE_PATTERNS.some(
    (p) =>
      url.protocol === `${p.protocol}:` &&
      url.hostname === p.hostname &&
      (!p.pathname || url.pathname.startsWith(p.pathname.slice(0, -2))),
  );
}
