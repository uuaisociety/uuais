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

jest.mock('@/lib/firebase-admin', () => ({
  adminDb: {
    collection: (name: string) => ({
      where: () => ({ orderBy: () => ({ get: async () => ({ docs: [] }) }) }),
      orderBy: () => ({
        get: async () => ({ docs: name === 'teamMembers' ? mockTeamDocs : [] }),
      }),
    }),
  },
}));

describe('getPublicSeed team projection', () => {
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
});
