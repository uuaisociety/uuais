const mockGetCachedPublicTeamDirectory = jest.fn();

jest.mock('@/lib/server-data-cache', () => ({
  getCachedPublicTeamDirectory: (...args: unknown[]) =>
    mockGetCachedPublicTeamDirectory(...args),
}));

describe('/api/team', () => {
  beforeEach(() => mockGetCachedPublicTeamDirectory.mockReset());

  it('returns selected public profiles and metadata with a 60-second browser cache header', async () => {
    mockGetCachedPublicTeamDirectory.mockResolvedValue({
      team: 'research',
      year: 2026,
      metadata: {},
      teamMembers: [{ id: 'ada', name: 'Ada' }],
    });
    const { GET } = await import('@/app/api/team/route');
    const response = await GET(
      new Request('https://example.com/api/team?team=research&year=2026'),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('public, max-age=60');
    expect(mockGetCachedPublicTeamDirectory).toHaveBeenCalledWith(
      'research',
      2026,
    );
    await expect(response.json()).resolves.toMatchObject({
      team: 'research',
      year: 2026,
      teamMembers: [{ id: 'ada', name: 'Ada' }],
    });
  });

  it('returns an uncached service error when team data is unavailable', async () => {
    mockGetCachedPublicTeamDirectory.mockRejectedValue(
      new Error('unavailable'),
    );
    const { GET } = await import('@/app/api/team/route');
    const response = await GET(new Request('https://example.com/api/team'));
    expect(response.status).toBe(503);
    expect(response.headers.get('cache-control')).toBe('no-store');
  });

  it('rejects invalid team/year before reading profiles', async () => {
    const { GET } = await import('@/app/api/team/route');
    const response = await GET(
      new Request('https://example.com/api/team?team=secrets&year=20'),
    );
    expect(response.status).toBe(400);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(mockGetCachedPublicTeamDirectory).not.toHaveBeenCalled();
  });

  it.each(['?team=', '?year='])('rejects empty query values', async (query) => {
    const { GET } = await import('@/app/api/team/route');
    const response = await GET(
      new Request(`https://example.com/api/team${query}`),
    );
    expect(response.status).toBe(400);
    expect(mockGetCachedPublicTeamDirectory).not.toHaveBeenCalled();
  });
});
