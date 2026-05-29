const mockGetTokens = jest.fn()
const mockCollection = jest.fn()
const mockRunTransaction = jest.fn()

jest.mock('next-firebase-auth-edge', () => ({ getTokens: (...args: unknown[]) => mockGetTokens(...args) }))
jest.mock('@/lib/auth-config', () => ({ authConfig: {} }))

jest.mock('firebase-admin', () => {
  const FieldValue = { serverTimestamp: () => ({ _method: 'serverTimestamp' }) }
  const firestoreFn = () => ({ runTransaction: (...args: unknown[]) => mockRunTransaction(...args) })
  ;(firestoreFn as { FieldValue: typeof FieldValue }).FieldValue = FieldValue
  return { firestore: firestoreFn as typeof firestoreFn & { FieldValue: typeof FieldValue }, FieldValue }
})

jest.mock('@/lib/firebase-admin', () => ({
  adminDb: { collection: (...args: unknown[]) => mockCollection(...args), runTransaction: (...args: unknown[]) => mockRunTransaction(...args) },
}))

function mockUsageSnapshot(docs: Record<string, unknown>[]) {
  mockCollection.mockReturnValue({
    where: () => ({
      get: () => ({
        docs: docs.map((d) => ({ data: () => d })),
      }),
    }),
    doc: () => ({ get: () => ({ exists: false }), set: jest.fn() }),
  })
}

describe('GET /api/admin/ai-usage', () => {
  beforeEach(() => { jest.clearAllMocks() })

  it('returns 401 when not authenticated', async () => {
    mockGetTokens.mockResolvedValue(null)
    const { GET } = await import('@/app/api/admin/ai-usage/route')
    const req = new Request('http://localhost/api/admin/ai-usage')
    const res = await GET(req as unknown as Request)
    expect(res.status).toBe(401)
  })

  it('returns 403 when not admin', async () => {
    mockGetTokens.mockResolvedValue({ decodedToken: { uid: 'user', admin: false } })
    const { GET } = await import('@/app/api/admin/ai-usage/route')
    const req = new Request('http://localhost/api/admin/ai-usage')
    const res = await GET(req as unknown as Request)
    expect(res.status).toBe(403)
  })

  it('returns zero usage when no data', async () => {
    mockGetTokens.mockResolvedValue({ decodedToken: { uid: 'admin', admin: true } })
    mockUsageSnapshot([])
    const { GET } = await import('@/app/api/admin/ai-usage/route')
    const req = new Request('http://localhost/api/admin/ai-usage')
    const res = await GET(req as unknown as Request)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.totalRequests).toBe(0)
    expect(body.activeUsers).toBe(0)
    expect(body.totalTokens).toBe(0)
  })

  it('aggregates usage across documents', async () => {
    mockGetTokens.mockResolvedValue({ decodedToken: { uid: 'admin', admin: true } })
    mockUsageSnapshot([
      { requestCount: 5, tokenUsage: 1000 },
      { requestCount: 3, tokenUsage: 500 },
    ])
    const { GET } = await import('@/app/api/admin/ai-usage/route')
    const req = new Request('http://localhost/api/admin/ai-usage')
    const res = await GET(req as unknown as Request)
    const body = await res.json()

    expect(body.totalRequests).toBe(8)
    expect(body.activeUsers).toBe(2)
    expect(body.totalTokens).toBe(1500)
    expect(body.averageTokensPerRequest).toBe(188)
  })
})
