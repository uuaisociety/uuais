let mockQueryCount = 0;

jest.mock('@/lib/firebase-admin', () => ({
  adminDb: {
    collection: () => {
      mockQueryCount += 1;
      return {
        where: () => ({
          limit: () => ({ get: async () => ({ empty: true, docs: [] }) }),
          get: async () => ({ docs: [] }),
        }),
        doc: () => ({ get: async () => ({ exists: false }) }),
      };
    },
  },
}));

describe('local build blog fixture', () => {
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

  it('returns empty public blog data without Firestore only for the dummy fixture', async () => {
    process.env.UUAIS_LOCAL_BUILD_FIXTURE = '1';
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = 'dummy-project';
    const { findPublishedBlogPost, getPublishedBlogPosts } =
      await import('@/lib/blog-server');

    await expect(findPublishedBlogPost('slug')).resolves.toBeNull();
    await expect(getPublishedBlogPosts()).resolves.toEqual([]);
    expect(mockQueryCount).toBe(0);
  });

  it('queries Firestore when the fixture flag is absent or the project is not the dummy project', async () => {
    const { findPublishedBlogPost, getPublishedBlogPosts } =
      await import('@/lib/blog-server');
    process.env.UUAIS_LOCAL_BUILD_FIXTURE = '1';
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = 'production-project';
    await getPublishedBlogPosts();
    process.env.UUAIS_LOCAL_BUILD_FIXTURE = '0';
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = 'dummy-project';
    await findPublishedBlogPost('slug');

    expect(mockQueryCount).toBe(3);
  });
});
