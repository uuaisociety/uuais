export function createAuthMocks() {
  const mockGetTokens = jest.fn()
  return {
    mockGetTokens,
    authEdgeFactory: { getTokens: (...args: unknown[]) => mockGetTokens(...args) },
    authConfigFactory: { authConfig: {} },
  }
}

export function createFetchCoursesMocks() {
  const mockFetchCourses = jest.fn<Promise<unknown[]>, []>()
  return {
    mockFetchCourses,
    coursesFactory: { fetchCourses: () => mockFetchCourses() },
  }
}

export function createFetchCourseByIdMocks() {
  const mockFetchCourseById = jest.fn()
  return {
    mockFetchCourseById,
    courseByIdFactory: { fetchCourseById: (...args: unknown[]) => mockFetchCourseById(...args) },
  }
}

export function createCollectionMock() {
  const chain: Record<string, jest.Mock> = {} as Record<string, jest.Mock>
  chain.where = jest.fn(() => chain)
  chain.count = jest.fn(() => chain)
  chain.limit = jest.fn(() => chain)
  chain.offset = jest.fn(() => chain)
  chain.orderBy = jest.fn(() => chain)
  chain.get = jest.fn().mockResolvedValue({ empty: true, docs: [], size: 0 })
  chain.doc = jest.fn(() => createDocRef())
  return chain as {
    where: jest.Mock
    count: jest.Mock
    limit: jest.Mock
    offset: jest.Mock
    orderBy: jest.Mock
    get: jest.Mock
    doc: jest.Mock
  }
}

export function createDocRef(id = 'doc-id') {
  return {
    id,
    get: jest.fn().mockResolvedValue({ exists: false, data: () => null }),
    set: jest.fn().mockResolvedValue(undefined),
    update: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined),
  }
}

export function createUseAdminMock(overrides: Record<string, unknown> = {}) {
  const mockUseAdmin = jest.fn()
  return {
    mockUseAdmin,
    useAdminFactory: { useAdmin: () => mockUseAdmin() },
    defaultAdminState: {
      user: null,
      loading: false,
      isAdmin: false,
      isSuperAdmin: false,
      claims: null,
      signInWithGoogle: jest.fn(),
      logout: jest.fn(),
      ...overrides,
    },
  }
}
