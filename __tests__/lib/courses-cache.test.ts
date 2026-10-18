const mockGet = jest.fn();
const mockSet = jest.fn();
const mockDelete = jest.fn();
const mockSourceGet = jest.fn();

jest.mock('@/lib/firebase-admin', () => ({
  adminDb: {
    collection: (name: string) => ({
      doc: () => ({ get: mockGet, set: mockSet, delete: mockDelete }),
      get: name === 'courses' ? mockSourceGet : mockGet,
    }),
  },
}));

describe('server course cache', () => {
  const snapshot = {
    docs: [
      {
        id: 'course-1',
        data: () => ({ Course_name: 'Course One', code: 'C1' }),
      },
    ],
  };

  beforeEach(() => {
    jest.resetModules();
    mockGet.mockReset().mockResolvedValue({ exists: false });
    mockSet.mockReset().mockResolvedValue(undefined);
    mockDelete.mockReset().mockResolvedValue(undefined);
    mockSourceGet.mockReset().mockResolvedValue(snapshot);
  });

  it('coalesces concurrent cold loads and keeps memory cache if persistence fails', async () => {
    mockSet.mockRejectedValue(new Error('write failed'));
    let finishSource!: (value: typeof snapshot) => void;
    mockSourceGet.mockReturnValue(
      new Promise((resolve) => {
        finishSource = resolve;
      }),
    );
    const { fetchCourses } = await import('@/lib/courses');
    const first = fetchCourses();
    const second = fetchCourses();
    finishSource(snapshot);
    await expect(Promise.all([first, second])).resolves.toHaveLength(2);
    await fetchCourses();
    expect(mockSourceGet).toHaveBeenCalledTimes(1);
  });

  it('refreshes after cache read failure and retries a failed source query later', async () => {
    mockGet.mockRejectedValue(new Error('cache unavailable'));
    mockSourceGet
      .mockRejectedValueOnce(new Error('source unavailable'))
      .mockResolvedValueOnce(snapshot);
    const { fetchCourses } = await import('@/lib/courses');
    await expect(fetchCourses()).rejects.toThrow('source unavailable');
    await expect(fetchCourses()).resolves.toHaveLength(1);
    expect(mockSourceGet).toHaveBeenCalledTimes(2);
  });

  it('uses memory after a successful refresh when cache reads fail', async () => {
    mockGet.mockRejectedValue(new Error('cache unavailable'));
    const { fetchCourses } = await import('@/lib/courses');
    await expect(fetchCourses()).resolves.toHaveLength(1);
    await expect(fetchCourses()).resolves.toHaveLength(1);
    expect(mockSourceGet).toHaveBeenCalledTimes(1);
  });

  it('expires persistent cache data and reloads after explicit invalidation', async () => {
    const { gzipSync } = await import('zlib');
    const course = { id: 'cached', title: 'Cached' };
    const now = Date.now();
    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(now);
    mockGet
      .mockResolvedValueOnce({
        exists: true,
        data: () => ({
          data: gzipSync(JSON.stringify([course])).toString('base64'),
          compressed: true,
          updatedAt: now,
        }),
      })
      .mockResolvedValue({ exists: false });
    const { fetchCourses, invalidateCourseCache } =
      await import('@/lib/courses');
    await expect(fetchCourses()).resolves.toEqual([course]);
    expect(mockSourceGet).not.toHaveBeenCalled();
    nowSpy.mockReturnValue(now + 24 * 60 * 60 * 1000 + 1);
    await expect(fetchCourses()).resolves.toHaveLength(1);
    expect(mockSourceGet).toHaveBeenCalledTimes(1);
    await invalidateCourseCache();
    expect(mockDelete).toHaveBeenCalledTimes(1);
    nowSpy.mockRestore();
    await expect(fetchCourses()).resolves.toHaveLength(1);
    expect(mockSourceGet).toHaveBeenCalledTimes(2);
  });

  it('keeps waiting through a second invalidation that starts during the first', async () => {
    let finishSource!: (value: typeof snapshot) => void;
    let finishFirstDelete!: () => void;
    let finishSecondDelete!: () => void;
    mockSourceGet.mockReturnValueOnce(
      new Promise((resolve) => {
        finishSource = resolve;
      }),
    );
    mockDelete
      .mockReturnValueOnce(
        new Promise((resolve) => {
          finishFirstDelete = resolve;
        }),
      )
      .mockReturnValueOnce(
        new Promise((resolve) => {
          finishSecondDelete = resolve;
        }),
      );
    const { fetchCourses, invalidateCourseCache } =
      await import('@/lib/courses');
    const firstLoad = fetchCourses();
    const firstInvalidation = invalidateCourseCache();
    const nextLoad = fetchCourses();
    const secondInvalidation = invalidateCourseCache();
    finishSource(snapshot);
    for (let i = 0; i < 8 && mockDelete.mock.calls.length < 1; i += 1)
      await Promise.resolve();
    expect(mockDelete).toHaveBeenCalledTimes(1);
    await expect(firstLoad).resolves.toHaveLength(1);
    finishFirstDelete();
    for (let i = 0; i < 8 && mockDelete.mock.calls.length < 2; i += 1)
      await Promise.resolve();
    expect(mockDelete).toHaveBeenCalledTimes(2);
    expect(mockSourceGet).toHaveBeenCalledTimes(1);
    finishSecondDelete();
    await Promise.all([firstInvalidation, secondInvalidation]);
    await expect(nextLoad).resolves.toHaveLength(1);
    expect(mockSourceGet).toHaveBeenCalledTimes(2);
    expect(mockDelete).toHaveBeenCalledTimes(2);
  });
});
