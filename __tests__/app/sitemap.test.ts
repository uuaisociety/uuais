const mockCacheEntries = new Map<string, Promise<unknown>>();
const mockCacheConfigs: Array<{
  keys: string[];
  options: { revalidate: number };
}> = [];

jest.mock('next/cache', () => ({
  unstable_cache: (
    fn: (...args: unknown[]) => Promise<unknown>,
    keys: string[],
    options: { revalidate: number },
  ) => {
    mockCacheConfigs.push({ keys, options });
    return (...args: unknown[]) => {
      const key = JSON.stringify([keys, args]);
      if (!mockCacheEntries.has(key)) {
        mockCacheEntries.set(key, Promise.resolve(fn(...args)));
      }
      return mockCacheEntries.get(key)!;
    };
  },
}));

jest.mock('@/lib/server-data', () => ({
  getPublicSeed: jest
    .fn()
    .mockResolvedValue({ events: [], jobs: [], faqs: [], team: [] }),
}));

jest.mock('@/lib/blog-server', () => ({
  getPublishedBlogPosts: jest.fn().mockResolvedValue([]),
}));
jest.mock('@/lib/showcase-server', () => ({
  getPublishedShowcaseProjects: jest.fn().mockResolvedValue([]),
}));

import { getPublicSeed } from '@/lib/server-data';
import { listPrograms, programSlug } from '@/lib/programs';
import { CODEX_AMBASSADOR_INTERVIEW_PUBLISH_AT } from '@/lib/content-publication';

describe('sitemap', () => {
  let sitemap: typeof import('@/app/sitemap').default;

  beforeEach(async () => {
    mockCacheEntries.clear();
    jest.mocked(getPublicSeed).mockClear();
    sitemap = (await import('@/app/sitemap')).default;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('lists every programme map, not just the catalogue', async () => {
    // The maps prerender their whole course list, so leaving them out hid the content.
    const urls = (await sitemap()).map((entry) => entry.url);
    const missing = listPrograms()
      .map((entry) => `/programs/${programSlug(entry)}`)
      .filter((path) => !urls.some((url) => url.endsWith(path)));

    expect(missing).toEqual([]);
    expect(listPrograms().length).toBeGreaterThan(70);
  });

  it('still lists the catalogue itself', async () => {
    const urls = (await sitemap()).map((entry) => entry.url);
    expect(urls.some((url) => url.endsWith('/programs'))).toBe(true);
  });

  it('includes the Codex ambassador interview', async () => {
    jest.useFakeTimers({ now: CODEX_AMBASSADOR_INTERVIEW_PUBLISH_AT });
    const urls = (await sitemap()).map((entry) => entry.url);
    expect(
      urls.some((url) => url.endsWith('/events/codex-ambassador-interview')),
    ).toBe(true);
  });

  it('omits the interview before release and includes it at release', async () => {
    jest.useFakeTimers({
      now: new Date(CODEX_AMBASSADOR_INTERVIEW_PUBLISH_AT.getTime() - 1),
    });
    const beforeRelease = (await sitemap()).map((entry) => entry.url);
    expect(
      beforeRelease.some((url) =>
        url.endsWith('/events/codex-ambassador-interview'),
      ),
    ).toBe(false);

    jest.setSystemTime(CODEX_AMBASSADOR_INTERVIEW_PUBLISH_AT);
    const atRelease = (await sitemap()).map((entry) => entry.url);
    expect(
      atRelease.some((url) =>
        url.endsWith('/events/codex-ambassador-interview'),
      ),
    ).toBe(true);
    expect(getPublicSeed).toHaveBeenCalledTimes(1);
    expect(
      mockCacheConfigs.some(
        ({ keys, options }) =>
          keys[0] === 'sitemap-dynamic-routes-v1' &&
          options.revalidate === 86400,
      ),
    ).toBe(true);
  });

  it('leaves out the routes gated while the navigator is unreleased', async () => {
    const urls = (await sitemap()).map((entry) => entry.url);
    expect(urls.some((url) => url.endsWith('/explore'))).toBe(false);
    expect(urls.some((url) => url.endsWith('/projects/course-navigator'))).toBe(
      false,
    );
  });
});
