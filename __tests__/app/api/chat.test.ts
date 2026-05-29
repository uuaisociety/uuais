const mockGetTokens = jest.fn()
const mockCheckRateLimit = jest.fn()
const mockIncrementUsage = jest.fn()
const mockProcessRAG = jest.fn()
jest.mock('next-firebase-auth-edge', () => ({ getTokens: (...args: unknown[]) => mockGetTokens(...args) }))
jest.mock('@/lib/auth-config', () => ({ authConfig: {} }))
jest.mock('@/lib/ai/rate-limit', () => ({
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
  incrementUsage: (...args: unknown[]) => mockIncrementUsage(...args),
  RateLimitError: class extends Error {
    resetAt: Date
    remaining: number
    constructor(msg: string) {
      super(msg); this.name = 'RateLimitError'; this.resetAt = new Date(); this.remaining = 0
    }
  },
}))
jest.mock('@/lib/ai/rag', () => ({ processRAGRequest: (...args: unknown[]) => mockProcessRAG(...args) }))
jest.mock('@/lib/ai/openrouter', () => ({ OpenRouterError: class extends Error { statusCode = 503 } }))

describe('POST /api/chat', () => {
  beforeEach(() => { jest.clearAllMocks() })
  jest.spyOn(console, 'error').mockImplementation(() => {})

  it('returns 401 when not authenticated', async () => {
    mockGetTokens.mockResolvedValue(null)
    const { POST } = await import('@/app/api/chat/route')
    const req = new Request('http://localhost/api/chat', { method: 'POST', body: JSON.stringify({ query: 'hello' }) })
    const res = await POST(req as unknown as Request)
    expect(res.status).toBe(401)
  })

  it('returns 400 when query is empty', async () => {
    mockGetTokens.mockResolvedValue({ decodedToken: { uid: 'user1' } })
    const { POST } = await import('@/app/api/chat/route')
    const req = new Request('http://localhost/api/chat', { method: 'POST', body: JSON.stringify({ query: '' }) })
    const res = await POST(req as unknown as Request)
    const body = await res.json()
    expect(res.status).toBe(400)
    expect(body.error).toMatch(/Bad request/i)
  })

  it('returns 400 when query is missing', async () => {
    mockGetTokens.mockResolvedValue({ decodedToken: { uid: 'user1' } })
    const { POST } = await import('@/app/api/chat/route')
    const req = new Request('http://localhost/api/chat', { method: 'POST', body: '{}' })
    const res = await POST(req as unknown as Request)
    const body = await res.json()
    expect(res.status).toBe(400)
    expect(body.error).toMatch(/Bad request/i)
  })

  it('returns 429 when rate limited', async () => {
    mockGetTokens.mockResolvedValue({ decodedToken: { uid: 'user1' } })
    mockCheckRateLimit.mockResolvedValue({ allowed: false, totalRequests: 50, remaining: 0, resetAt: new Date() })

    const { POST } = await import('@/app/api/chat/route')
    const req = new Request('http://localhost/api/chat', { method: 'POST', body: JSON.stringify({ query: 'hello' }) })
    const res = await POST(req as unknown as Request)
    const body = await res.json()
    expect(res.status).toBe(429)
    expect(body.error).toMatch(/Rate limit/i)
  })

  it('returns successful response', async () => {
    mockGetTokens.mockResolvedValue({ decodedToken: { uid: 'user1' } })
    mockCheckRateLimit.mockResolvedValue({ allowed: true, totalRequests: 50, remaining: 49, resetAt: new Date() })
    mockProcessRAG.mockResolvedValue({ result: 'AI response', usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 }, debug: null })
    mockIncrementUsage.mockResolvedValue({ remaining: 48, totalRequests: 50, resetAt: new Date() })

    const { POST } = await import('@/app/api/chat/route')
    const req = new Request('http://localhost/api/chat', { method: 'POST', body: JSON.stringify({ query: 'hello' }) })
    const res = await POST(req as unknown as Request)
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.data).toBe('AI response')
    expect(body.usage.totalTokens).toBe(15)
  })

  it('passes debug data for admin users', async () => {
    mockGetTokens.mockResolvedValue({ decodedToken: { uid: 'admin1', admin: true } })
    mockCheckRateLimit.mockResolvedValue({ allowed: true, totalRequests: 50, remaining: 49, resetAt: new Date() })
    mockProcessRAG.mockResolvedValue({ result: 'response', usage: { promptTokens: 5, completionTokens: 5, totalTokens: 10 }, debug: { sources: ['doc1'] } })
    mockIncrementUsage.mockResolvedValue({ remaining: 48, totalRequests: 50, resetAt: new Date() })

    const { POST } = await import('@/app/api/chat/route')
    const req = new Request('http://localhost/api/chat', { method: 'POST', body: JSON.stringify({ query: 'hello' }) })
    const res = await POST(req as unknown as Request)
    const body = await res.json()
    expect(body.debug).toEqual({ sources: ['doc1'] })
  })
})

describe('GET /api/chat', () => {
  beforeEach(() => { jest.clearAllMocks() })

  it('returns 401 when not authenticated', async () => {
    mockGetTokens.mockResolvedValue(null)
    const { GET } = await import('@/app/api/chat/route')
    const req = new Request('http://localhost/api/chat')
    const res = await GET(req as unknown as Request)
    expect(res.status).toBe(401)
  })

  it('returns rate limit status', async () => {
    mockGetTokens.mockResolvedValue({ decodedToken: { uid: 'user1' } })
    mockCheckRateLimit.mockResolvedValue({ allowed: true, totalRequests: 50, remaining: 30, resetAt: new Date('2026-06-01') })

    const { GET } = await import('@/app/api/chat/route')
    const req = new Request('http://localhost/api/chat')
    const res = await GET(req as unknown as Request)
    const body = await res.json()
    expect(body.remaining).toBe(30)
    expect(body.allowed).toBe(true)
  })
})
