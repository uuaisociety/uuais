const mockSeed = jest.fn();
const mockDirectoryIndex = jest.fn();
const mockSelectedTeam = jest.fn();
const mockTeamIds = jest.fn();
const mockCacheEntries = new Map<string, unknown>();
const mockCacheConfigs: Array<{
  keys: string[];
  options: { revalidate: number };
}> = [];

jest.mock('next/cache', () => ({
  unstable_cache: (
    fn: (...args: unknown[]) => unknown,
    keys: string[],
    options: { revalidate: number },
  ) => {
    mockCacheConfigs.push({ keys, options });
    return (...args: unknown[]) => {
      const key = JSON.stringify([keys, args]);
      if (!mockCacheEntries.has(key)) mockCacheEntries.set(key, fn(...args));
      return mockCacheEntries.get(key);
    };
  },
}));
jest.mock('@/lib/server-data', () => ({
  getPublicSeed: mockSeed,
  getPublicTeamDirectoryIndex: mockDirectoryIndex,
  getPublicTeamMembersForSelection: mockSelectedTeam,
  publicTeamIdsForSelection: mockTeamIds,
}));

describe('cached public server data', () => {
  const oldFixture = process.env.UUAIS_LOCAL_BUILD_FIXTURE;
  const oldProject = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  beforeEach(() => {
    jest.resetModules();
    mockSeed.mockReset();
    mockDirectoryIndex.mockReset();
    mockSelectedTeam.mockReset();
    mockTeamIds.mockReset();
    mockCacheEntries.clear();
    mockCacheConfigs.length = 0;
    delete process.env.UUAIS_LOCAL_BUILD_FIXTURE;
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = 'test-project';
  });

  afterAll(() => {
    if (oldFixture === undefined) delete process.env.UUAIS_LOCAL_BUILD_FIXTURE;
    else process.env.UUAIS_LOCAL_BUILD_FIXTURE = oldFixture;
    if (oldProject === undefined)
      delete process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    else process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = oldProject;
  });

  it('configures separate 60-second seed and team caches', async () => {
    mockSeed.mockResolvedValue({
      events: [],
      jobs: [],
      faqs: [],
      teamMembers: [],
    });
    mockDirectoryIndex.mockResolvedValue({
      metadata: { years: [], defaultYear: 'all', countsByYear: { all: {} } },
      rows: [],
    });
    mockTeamIds.mockReturnValue([]);
    const { getCachedPublicSeed, getCachedPublicTeamDirectory } =
      await import('@/lib/server-data-cache');
    await getCachedPublicSeed();
    await getCachedPublicTeamDirectory();
    expect(mockCacheConfigs.map((config) => config.options.revalidate)).toEqual(
      [60, 60, 60],
    );
    expect(mockCacheConfigs.map((config) => config.keys)).toEqual([
      ['public-ssr-seed-v3-recent-events-no-team', 'test-project'],
      ['public-team-directory-index-v1', 'test-project'],
      ['public-team-selected-profiles-v1', 'test-project'],
    ]);
  });

  it('bypasses fixture data and keeps seed failures outside cached success', async () => {
    process.env.UUAIS_LOCAL_BUILD_FIXTURE = '1';
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = 'dummy-project';
    const cache = await import('@/lib/server-data-cache');
    expect(await cache.getCachedPublicSeed()).toEqual({
      events: [],
      jobs: [],
      faqs: [],
      teamMembers: [],
    });
    expect(mockSeed).not.toHaveBeenCalled();

    delete process.env.UUAIS_LOCAL_BUILD_FIXTURE;
    mockSeed.mockRejectedValue(new Error('source unavailable'));
    expect(await cache.getCachedPublicSeed()).toEqual({
      events: [],
      jobs: [],
      faqs: [],
      teamMembers: [],
    });
    expect(mockSeed).toHaveBeenCalledWith({
      throwOnError: true,
      recentEventsOnly: true,
      includeTeamMembers: false,
    });
  });

  it('uses cached metadata to select profiles for the requested team/year', async () => {
    const index = {
      metadata: {
        years: [2026],
        defaultYear: 2026,
        countsByYear: { all: {}, '2026': {} },
      },
      rows: [{ id: 'ada' }],
    };
    mockDirectoryIndex.mockResolvedValue(index);
    mockTeamIds.mockReturnValue(['ada']);
    mockSelectedTeam.mockResolvedValue([{ id: 'ada' }]);
    const { getCachedPublicTeamDirectory } =
      await import('@/lib/server-data-cache');
    await expect(
      getCachedPublicTeamDirectory('research', 2026),
    ).resolves.toMatchObject({
      team: 'research',
      year: 2026,
      teamMembers: [{ id: 'ada' }],
    });
    await getCachedPublicTeamDirectory('research', 2026);
    expect(mockTeamIds).toHaveBeenCalledWith(index.rows, 'research', 2026);
    expect(mockSelectedTeam).toHaveBeenCalledWith('research', 2026, ['ada']);
    expect(mockSelectedTeam).toHaveBeenCalledTimes(1);
  });

  it('lets directory failures reach the API error handler', async () => {
    mockDirectoryIndex.mockRejectedValue(new Error('source unavailable'));
    const { getCachedPublicTeamDirectory } =
      await import('@/lib/server-data-cache');
    await expect(getCachedPublicTeamDirectory()).rejects.toThrow(
      'source unavailable',
    );
  });
});
