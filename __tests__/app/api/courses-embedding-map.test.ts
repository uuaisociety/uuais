const mockGetTokens = jest.fn()
const mockCollection = jest.fn()
const mockProjectEmbeddings = jest.fn()

jest.mock('next-firebase-auth-edge', () => ({ getTokens: (...args: unknown[]) => mockGetTokens(...args) }))
jest.mock('@/lib/auth-config', () => ({ authConfig: {} }))

jest.mock('firebase-admin', () => ({
  firestore: () => ({ FieldValue: { serverTimestamp: () => ({}) } }),
  FieldValue: { serverTimestamp: () => ({}) },
}))

jest.mock('@/lib/firebase-admin', () => ({
  adminDb: { collection: (...args: unknown[]) => mockCollection(...args) },
}))

jest.mock('@/lib/ai/projection', () => ({
  projectEmbeddings: (...args: unknown[]) => mockProjectEmbeddings(...args),
}))

function mockCacheDoc(exists: boolean, data?: unknown) {
  mockCollection.mockReturnValue({
    get: () => ({ empty: false, docs: [] }),
    doc: () => ({
      get: () => ({ exists, data: () => data }),
      set: jest.fn().mockResolvedValue(undefined),
    }),
  })
}

describe('GET /api/courses/embedding-map', () => {
  beforeEach(() => { jest.clearAllMocks() })

  it('returns 401 when not authenticated', async () => {
    mockGetTokens.mockResolvedValue(null)
    const { GET } = await import('@/app/api/courses/embedding-map/route')
    const req = new Request('http://localhost/api/courses/embedding-map')
    const res = await GET(req as unknown as Request)
    expect(res.status).toBe(401)
  })

  it('returns 403 when not admin', async () => {
    mockGetTokens.mockResolvedValue({ decodedToken: { uid: 'user', admin: false } })
    const { GET } = await import('@/app/api/courses/embedding-map/route')
    const req = new Request('http://localhost/api/courses/embedding-map')
    const res = await GET(req as unknown as Request)
    expect(res.status).toBe(403)
  })

  it('returns cached projection when available', async () => {
    mockGetTokens.mockResolvedValue({ decodedToken: { uid: 'admin', admin: true } })
    mockCacheDoc(true, {
      points: [{ courseId: 'c1', title: 'ML', x: 0.5, y: 0.5 }],
      algorithm: 'tsne', dimensions: 2, courseCount: 1,
    })
    const { GET } = await import('@/app/api/courses/embedding-map/route')
    const req = new Request('http://localhost/api/courses/embedding-map')
    const res = await GET(req as unknown as Request)
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.cached).toBe(true)
    expect(body.points).toHaveLength(1)
  })

  it('returns empty points when no courses with embeddings', async () => {
    mockGetTokens.mockResolvedValue({ decodedToken: { uid: 'admin', admin: true } })
    mockCacheDoc(false)
    mockCollection.mockReturnValue({
      get: () => ({ empty: false, docs: [{ data: () => ({ title: 'ML', embedding: null }) }] }),
      doc: () => ({ get: () => ({ exists: false }), set: jest.fn() }),
    })
    const { GET } = await import('@/app/api/courses/embedding-map/route')
    const req = new Request('http://localhost/api/courses/embedding-map')
    const res = await GET(req as unknown as Request)
    const body = await res.json()
    expect(body.courseCount).toBe(0)
    expect(body.points).toEqual([])
  })
})
