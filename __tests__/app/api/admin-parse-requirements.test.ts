const mockGetTokens = jest.fn()
const mockFetchCourses = jest.fn()
const mockParseRequirements = jest.fn()
const mockCollection = jest.fn()

jest.mock('next-firebase-auth-edge', () => ({ getTokens: (...args: unknown[]) => mockGetTokens(...args) }))
jest.mock('@/lib/auth-config', () => ({ authConfig: {} }))
jest.mock('@/lib/courses', () => ({ fetchCourses: () => mockFetchCourses() }))
jest.mock('@/lib/prerequisites/parser', () => ({ parseRequirements: (...args: unknown[]) => mockParseRequirements(...args) }))

jest.mock('firebase-admin', () => ({
  firestore: () => ({ FieldValue: { serverTimestamp: () => ({}) } }),
  FieldValue: { serverTimestamp: () => ({}) },
}))

jest.mock('@/lib/firebase-admin', () => ({
  adminDb: { collection: (...args: unknown[]) => mockCollection(...args), runTransaction: jest.fn() },
}))

const courses = [
  {
    id: 'c1', title: 'ML', code: '1MA001', level: "Master's", description: '', tags: [],
    credits: 5, entry_requirements: 'Linear Algebra', generalRequirements: [],
  },
  {
    id: 'c2', title: 'Algebra', code: '1MA002', level: "Bachelor's", description: '', tags: [],
    credits: 5, entry_requirements: '', generalRequirements: [],
  },
]

describe('POST /api/admin/parse-requirements', () => {
  beforeEach(() => { jest.clearAllMocks() })

  it('returns 401 when not authenticated', async () => {
    mockGetTokens.mockResolvedValue(null)
    const { POST } = await import('@/app/api/admin/parse-requirements/route')
    const req = new Request('http://localhost/api/admin/parse-requirements', { method: 'POST', body: JSON.stringify({ courseId: 'c1' }) })
    const res = await POST(req as unknown as Request)
    expect(res.status).toBe(401)
  })

  it('returns 403 when not admin', async () => {
    mockGetTokens.mockResolvedValue({ decodedToken: { uid: 'user', admin: false } })
    const { POST } = await import('@/app/api/admin/parse-requirements/route')
    const req = new Request('http://localhost/api/admin/parse-requirements', { method: 'POST', body: JSON.stringify({ courseId: 'c1' }) })
    const res = await POST(req as unknown as Request)
    expect(res.status).toBe(403)
  })

  it('returns 400 when courseId missing', async () => {
    mockGetTokens.mockResolvedValue({ decodedToken: { uid: 'admin', admin: true } })
    const { POST } = await import('@/app/api/admin/parse-requirements/route')
    const req = new Request('http://localhost/api/admin/parse-requirements', { method: 'POST', body: JSON.stringify({}) })
    const res = await POST(req as unknown as Request)
    const body = await res.json()
    expect(res.status).toBe(400)
    expect(body.error).toMatch(/courseId/i)
  })

  it('returns 404 when course not found', async () => {
    mockGetTokens.mockResolvedValue({ decodedToken: { uid: 'admin', admin: true } })
    mockFetchCourses.mockResolvedValue([])
    const { POST } = await import('@/app/api/admin/parse-requirements/route')
    const req = new Request('http://localhost/api/admin/parse-requirements', { method: 'POST', body: JSON.stringify({ courseId: 'nonexistent' }) })
    const res = await POST(req as unknown as Request)
    const body = await res.json()
    expect(res.status).toBe(404)
    expect(body.error).toMatch(/not found/i)
  })

  it('parses single course requirements', async () => {
    mockGetTokens.mockResolvedValue({ decodedToken: { uid: 'admin', admin: true } })
    mockFetchCourses.mockResolvedValue(courses)
    mockParseRequirements.mockResolvedValue({ parsed: true })
    mockCollection.mockReturnValue({ doc: () => ({ update: jest.fn().mockResolvedValue(undefined) }) })

    const { POST } = await import('@/app/api/admin/parse-requirements/route')
    const req = new Request('http://localhost/api/admin/parse-requirements', { method: 'POST', body: JSON.stringify({ courseId: 'c1' }) })
    const res = await POST(req as unknown as Request)
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.structured_requirements).toEqual({ parsed: true })
  })

  it('parses all courses when courseId is "all"', async () => {
    mockGetTokens.mockResolvedValue({ decodedToken: { uid: 'admin', admin: true } })
    mockFetchCourses.mockResolvedValue(courses)
    mockParseRequirements.mockResolvedValue({ parsed: true })
    mockCollection.mockReturnValue({ doc: () => ({ update: jest.fn().mockResolvedValue(undefined) }) })

    const { POST } = await import('@/app/api/admin/parse-requirements/route')
    const req = new Request('http://localhost/api/admin/parse-requirements', { method: 'POST', body: JSON.stringify({ courseId: 'all' }) })
    const res = await POST(req as unknown as Request)
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.parsed).toBe(1)
    expect(body.skipped).toBe(1)
  })
})
