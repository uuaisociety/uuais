import { createAuthMocks } from '@/__tests__/helpers/mocks'

const mockFetchNewsCandidates = jest.fn()
const { mockGetTokens, authEdgeFactory, authConfigFactory } = createAuthMocks()
jest.mock('next-firebase-auth-edge', () => authEdgeFactory)
jest.mock('@/lib/auth-config', () => authConfigFactory)
jest.mock('@/lib/ai/blog/news', () => ({
  fetchNewsCandidates: (...args: unknown[]) => mockFetchNewsCandidates(...args),
}))

describe('POST /api/admin/blog/news-candidates', () => {
  beforeEach(() => { jest.clearAllMocks() })

  it('returns 401 when not authenticated', async () => {
    mockGetTokens.mockResolvedValue(null)
    const { POST } = await import('@/app/api/admin/blog/news-candidates/route')
    const req = new Request('http://localhost/api/admin/blog/news-candidates', { method: 'POST', body: '{}' })
    const res = await POST(req as unknown as Request)
    const body = await res.json()

    expect(res.status).toBe(401)
    expect(body.error).toBe('Unauthorized')
  })

  it('returns 403 when not admin', async () => {
    mockGetTokens.mockResolvedValue({ decodedToken: { uid: 'user', admin: false } })
    const { POST } = await import('@/app/api/admin/blog/news-candidates/route')
    const req = new Request('http://localhost/api/admin/blog/news-candidates', { method: 'POST', body: '{}' })
    const res = await POST(req as unknown as Request)
    const body = await res.json()

    expect(res.status).toBe(403)
    expect(body.error).toMatch(/admin access/i)
  })

  it('returns candidates for an admin', async () => {
    mockGetTokens.mockResolvedValue({ decodedToken: { uid: 'admin', admin: true } })
    mockFetchNewsCandidates.mockResolvedValue({
      candidates: [{ id: '1', title: 'T', url: 'https://x.com/a', source: 'x', snippet: 's' }],
      sources: { feeds: ['x.com'], exa: true },
      warnings: [],
    })

    const { POST } = await import('@/app/api/admin/blog/news-candidates/route')
    const req = new Request('http://localhost/api/admin/blog/news-candidates', { method: 'POST', body: '{}' })
    const res = await POST(req as unknown as Request)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.candidates).toHaveLength(1)
    expect(body.candidates[0]).toEqual({ id: '1', title: 'T', url: 'https://x.com/a', source: 'x', snippet: 's' })
    expect(body.sources.exa).toBe(true)
  })

  it('passes the query param through to fetchNewsCandidates', async () => {
    mockGetTokens.mockResolvedValue({ decodedToken: { uid: 'admin', admin: true } })
    mockFetchNewsCandidates.mockResolvedValue({ candidates: [], sources: { feeds: [], exa: false }, warnings: [] })

    const { POST } = await import('@/app/api/admin/blog/news-candidates/route')
    const req = new Request('http://localhost/api/admin/blog/news-candidates', { method: 'POST', body: JSON.stringify({ query: 'hello' }) })
    await POST(req as unknown as Request)

    expect(mockFetchNewsCandidates).toHaveBeenCalledTimes(1)
    expect(mockFetchNewsCandidates.mock.calls[0][0].query).toBe('hello')
  })

  it('returns 500 on fetch failure', async () => {
    mockGetTokens.mockResolvedValue({ decodedToken: { uid: 'admin', admin: true } })
    mockFetchNewsCandidates.mockRejectedValue(new Error('boom'))

    const { POST } = await import('@/app/api/admin/blog/news-candidates/route')
    const req = new Request('http://localhost/api/admin/blog/news-candidates', { method: 'POST', body: '{}' })
    const res = await POST(req as unknown as Request)
    const body = await res.json()

    expect(res.status).toBe(500)
    expect(body.message).toMatch(/boom/)
  })
})
