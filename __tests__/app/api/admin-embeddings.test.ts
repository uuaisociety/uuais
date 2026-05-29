const mockGetTokens = jest.fn()
const mockFetchCourses = jest.fn()
const mockGetEmbeddingCount = jest.fn()
const mockGenerateEmbedding = jest.fn()

jest.mock('next-firebase-auth-edge', () => ({ getTokens: (...args: unknown[]) => mockGetTokens(...args) }))
jest.mock('@/lib/auth-config', () => ({ authConfig: {} }))
jest.mock('@/lib/courses', () => ({ fetchCourses: () => mockFetchCourses() }))
jest.mock('@/lib/ai/vector-store', () => ({
  getEmbeddingCount: () => mockGetEmbeddingCount(),
  generateAndStoreCourseEmbedding: (c: unknown) => mockGenerateEmbedding(c),
}))

const courses = [
  { id: 'c1', title: 'ML', code: '1MA001', level: "Master's", description: '', tags: [], credits: 5, entry_requirements: '' },
  { id: 'c2', title: 'Algebra', code: '1MA002', level: "Bachelor's", description: '', tags: [], credits: 5, entry_requirements: '' },
]

describe('GET /api/admin/embeddings', () => {
  beforeEach(() => { jest.clearAllMocks() })

  it('returns 401 when not admin', async () => {
    mockGetTokens.mockResolvedValue(null)
    const { GET } = await import('@/app/api/admin/embeddings/route')
    const req = new Request('http://localhost/api/admin/embeddings')
    const res = await GET(req as unknown as Request)
    expect(res.status).toBe(401)
  })

  it('returns embedding status', async () => {
    mockGetTokens.mockResolvedValue({ decodedToken: { uid: 'admin', admin: true } })
    mockGetEmbeddingCount.mockResolvedValue(1)
    mockFetchCourses.mockResolvedValue(courses)
    const { GET } = await import('@/app/api/admin/embeddings/route')
    const req = new Request('http://localhost/api/admin/embeddings')
    const res = await GET(req as unknown as Request)
    const body = await res.json()

    expect(body.embeddingCount).toBe(1)
    expect(body.totalCourses).toBe(2)
    expect(body.needsGeneration).toBe(true)
  })
})

describe('POST /api/admin/embeddings', () => {
  beforeEach(() => { jest.clearAllMocks() })

  it('returns 400 when courseId missing', async () => {
    mockGetTokens.mockResolvedValue({ decodedToken: { uid: 'admin', admin: true } })
    const { POST } = await import('@/app/api/admin/embeddings/route')
    const req = new Request('http://localhost/api/admin/embeddings', {
      method: 'POST', body: JSON.stringify({}),
    })
    const res = await POST(req as unknown as Request)
    const body = await res.json()
    expect(res.status).toBe(400)
    expect(body.error).toMatch(/courseId/i)
  })

  it('returns 404 when course not found', async () => {
    mockGetTokens.mockResolvedValue({ decodedToken: { uid: 'admin', admin: true } })
    mockFetchCourses.mockResolvedValue([])
    const { POST } = await import('@/app/api/admin/embeddings/route')
    const req = new Request('http://localhost/api/admin/embeddings', {
      method: 'POST', body: JSON.stringify({ courseId: 'nonexistent' }),
    })
    const res = await POST(req as unknown as Request)
    const body = await res.json()
    expect(res.status).toBe(404)
    expect(body.error).toMatch(/not found/i)
  })

  it('generates embedding for valid course', async () => {
    mockGetTokens.mockResolvedValue({ decodedToken: { uid: 'admin', admin: true } })
    mockFetchCourses.mockResolvedValue(courses)
    mockGenerateEmbedding.mockResolvedValue(undefined)
    const { POST } = await import('@/app/api/admin/embeddings/route')
    const req = new Request('http://localhost/api/admin/embeddings', {
      method: 'POST', body: JSON.stringify({ courseId: 'c1' }),
    })
    const res = await POST(req as unknown as Request)
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.courseId).toBe('c1')
  })
})

describe('PUT /api/admin/embeddings', () => {
  beforeEach(() => { jest.clearAllMocks() })

  it('generates embeddings for all courses', async () => {
    mockGetTokens.mockResolvedValue({ decodedToken: { uid: 'admin', admin: true } })
    mockFetchCourses.mockResolvedValue(courses)
    mockGenerateEmbedding.mockResolvedValue(undefined)
    const { PUT } = await import('@/app/api/admin/embeddings/route')
    const req = new Request('http://localhost/api/admin/embeddings', { method: 'PUT' })
    const res = await PUT(req as unknown as Request)
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.generated).toBe(2)
    expect(body.failed).toBe(0)
  })

  it('reports failures', async () => {
    mockGetTokens.mockResolvedValue({ decodedToken: { uid: 'admin', admin: true } })
    mockFetchCourses.mockResolvedValue(courses)
    mockGenerateEmbedding.mockRejectedValueOnce(new Error('API error'))
    mockGenerateEmbedding.mockResolvedValueOnce(undefined)
    const { PUT } = await import('@/app/api/admin/embeddings/route')
    const req = new Request('http://localhost/api/admin/embeddings', { method: 'PUT' })
    const res = await PUT(req as unknown as Request)
    const body = await res.json()
    expect(body.generated).toBe(1)
    expect(body.failed).toBe(1)
  })
})
