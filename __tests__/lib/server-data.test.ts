const mockTeamDocs = [
  {
    id: 'ada',
    data: () => ({
      name: 'Ada',
      position: 'Board',
      companyEmail: 'ada@uu.se',
      email: 'public@uu.se',
      personalEmail: 'private@example.com',
      notes: 'private note',
      futureSensitiveField: 'secret',
      published: true,
    }),
  },
  {
    id: 'draft',
    data: () => ({
      name: 'Draft member',
      published: false,
      personalEmail: 'draft@example.com',
    }),
  },
];
let mockQueryCount = 0;

jest.mock('@/lib/firebase-admin', () => ({
  adminDb: {
    collection: (name: string) => ({
      where: () => ({
        orderBy: () => ({
          get: async () => {
            mockQueryCount += 1;
            return { docs: [] };
          },
        }),
      }),
      orderBy: () => ({
        get: async () => {
          mockQueryCount += 1;
          return { docs: name === 'teamMembers' ? mockTeamDocs : [] };
        },
      }),
    }),
  },
}));

describe('getPublicSeed team projection', () => {
  const originalFixture = process.env.UUAIS_LOCAL_BUILD_FIXTURE;
  const originalProjectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  afterEach(() => {
    if (originalFixture === undefined)
      delete process.env.UUAIS_LOCAL_BUILD_FIXTURE;
    else process.env.UUAIS_LOCAL_BUILD_FIXTURE = originalFixture;
    if (originalProjectId === undefined)
      delete process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    else process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = originalProjectId;
    mockQueryCount = 0;
  });

  it('keeps the public team contract and drops private and future fields', async () => {
    const { getPublicSeed } = await import('@/lib/server-data');
    const { teamMembers } = await getPublicSeed();
    expect(teamMembers).toHaveLength(1);
    expect(teamMembers[0]).toMatchObject({
      id: 'ada',
      name: 'Ada',
      position: 'Board',
      companyEmail: 'ada@uu.se',
      email: 'public@uu.se',
    });
    expect(teamMembers[0]).not.toHaveProperty('personalEmail');
    expect(teamMembers[0]).not.toHaveProperty('notes');
    expect(teamMembers[0]).not.toHaveProperty('futureSensitiveField');
  });

  it('uses empty local data only for the explicit dummy-project build fixture', async () => {
    process.env.UUAIS_LOCAL_BUILD_FIXTURE = '1';
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = 'dummy-project';

    const { getPublicSeed } = await import('@/lib/server-data');
    const seed = await getPublicSeed({ throwOnError: true });

    expect(seed).toEqual({ events: [], jobs: [], faqs: [], teamMembers: [] });
    expect(mockQueryCount).toBe(0);
  });

  it('keeps Firestore behavior when the fixture flag is used with a real project id', async () => {
    process.env.UUAIS_LOCAL_BUILD_FIXTURE = '1';
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = 'production-project';

    const { getPublicSeed } = await import('@/lib/server-data');
    const seed = await getPublicSeed();

    expect(seed.teamMembers).toHaveLength(1);
    expect(mockQueryCount).toBe(4);
  });
});
