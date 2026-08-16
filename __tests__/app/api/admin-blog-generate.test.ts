import { createAuthMocks } from '@/__tests__/helpers/mocks'

const mockGenerateBlogDraft = jest.fn()
const mockIncrementUsage = jest.fn()
const mockFetchNews = jest.fn()
const mockOpenRouterError = class extends Error {
  statusCode = 503
}
const { mockGetTokens, authEdgeFactory, authConfigFactory } = createAuthMocks()
jest.mock('next-firebase-auth-edge', () => authEdgeFactory)
jest.mock('@/lib/auth-config', () => authConfigFactory)
jest.mock('@/lib/ai/blog/generate', () => ({
  generateBlogDraft: (...args: unknown[]) => mockGenerateBlogDraft(...args),
}))
jest.mock('@/lib/ai/blog/news', () => ({
  fetchNewsCandidates: (...args: unknown[]) => mockFetchNews(...args),
}))
jest.mock('@/lib/ai/rate-limit', () => ({
  incrementUsage: (...args: unknown[]) => mockIncrementUsage(...args),
}))
jest.mock('@/lib/ai/openrouter', () => ({ OpenRouterError: mockOpenRouterError }))

const successResult = {
  draftId: 'draft-1',
  usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
}

describe('POST /api/admin/blog/generate', () => {
  beforeEach(() => { jest.clearAllMocks() })

  it('returns 401 when not authenticated', async () => {
    mockGetTokens.mockResolvedValue(null)
    const { POST } = await import('@/app/api/admin/blog/generate/route')
    const req = new Request('http://localhost/api/admin/blog/generate', { method: 'POST', body: '{}' })
    const res = await POST(req as unknown as Request)
    expect(res.status).toBe(401)
  })

  it('returns 403 when not admin', async () => {
    mockGetTokens.mockResolvedValue({ decodedToken: { uid: 'user', admin: false } })
    const { POST } = await import('@/app/api/admin/blog/generate/route')
    const req = new Request('http://localhost/api/admin/blog/generate', { method: 'POST', body: '{}' })
    const res = await POST(req as unknown as Request)
    expect(res.status).toBe(403)
  })

  it('returns 400 when type is invalid or missing', async () => {
    mockGetTokens.mockResolvedValue({ decodedToken: { uid: 'admin1', admin: true } })
    const { POST } = await import('@/app/api/admin/blog/generate/route')
    const req = new Request('http://localhost/api/admin/blog/generate', { method: 'POST', body: JSON.stringify({}) })
    const res = await POST(req as unknown as Request)
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error).toBe('Bad request')
  })

  it('returns 400 when weekly-digest has no selected items', async () => {
    mockGetTokens.mockResolvedValue({ decodedToken: { uid: 'admin1', admin: true } })
    const { POST } = await import('@/app/api/admin/blog/generate/route')
    const req = new Request('http://localhost/api/admin/blog/generate', { method: 'POST', body: JSON.stringify({ type: 'weekly-digest', selectedItems: [] }) })
    const res = await POST(req as unknown as Request)
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.message).toMatch(/Select at least one news item/)
  })

  it('auto-picks candidates for a weekly-digest when autoPick is true', async () => {
    mockGetTokens.mockResolvedValue({ decodedToken: { uid: 'admin1', admin: true } })
    mockFetchNews.mockResolvedValue({
      candidates: [
        { id: 'c1', title: 'Story 1', url: 'https://x.com/1', source: 'x.com', snippet: 's' },
        { id: 'c2', title: 'Story 2', url: 'https://x.com/2', source: 'x.com', snippet: 's' },
      ],
      sources: { feeds: ['x.com'], exa: false },
      warnings: [],
    })
    mockGenerateBlogDraft.mockResolvedValue(successResult)
    mockIncrementUsage.mockResolvedValue({})

    const { POST } = await import('@/app/api/admin/blog/generate/route')
    const req = new Request('http://localhost/api/admin/blog/generate', {
      method: 'POST',
      body: JSON.stringify({ type: 'weekly-digest', autoPick: true, selectedItems: [] }),
    })
    const res = await POST(req as unknown as Request)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(mockFetchNews).toHaveBeenCalledTimes(1)
    const [input] = mockGenerateBlogDraft.mock.calls[0]
    expect(input.autoPick).toBe(true)
    expect(input.allCandidates).toHaveLength(2)
    expect(input.selectedItems).toEqual([])
  })

  it('does not auto-pick for event posts', async () => {
    mockGetTokens.mockResolvedValue({ decodedToken: { uid: 'admin1', admin: true } })
    mockGenerateBlogDraft.mockResolvedValue(successResult)
    mockIncrementUsage.mockResolvedValue({})

    const { POST } = await import('@/app/api/admin/blog/generate/route')
    const req = new Request('http://localhost/api/admin/blog/generate', {
      method: 'POST',
      body: JSON.stringify({ type: 'event-preview', eventId: 'e1', autoPick: true }),
    })
    await POST(req as unknown as Request)

    expect(mockFetchNews).not.toHaveBeenCalled()
    const [input] = mockGenerateBlogDraft.mock.calls[0]
    expect(input.autoPick).toBe(false)
    expect(input.allCandidates).toBeUndefined()
  })

  it('returns 400 when event-recap has no eventId', async () => {
    mockGetTokens.mockResolvedValue({ decodedToken: { uid: 'admin1', admin: true } })
    const { POST } = await import('@/app/api/admin/blog/generate/route')
    const req = new Request('http://localhost/api/admin/blog/generate', { method: 'POST', body: JSON.stringify({ type: 'event-recap' }) })
    const res = await POST(req as unknown as Request)
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.message).toMatch(/Select an event/)
  })

  it('returns 400 when event-preview has no eventId', async () => {
    mockGetTokens.mockResolvedValue({ decodedToken: { uid: 'admin1', admin: true } })
    const { POST } = await import('@/app/api/admin/blog/generate/route')
    const req = new Request('http://localhost/api/admin/blog/generate', { method: 'POST', body: JSON.stringify({ type: 'event-preview' }) })
    const res = await POST(req as unknown as Request)
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.message).toMatch(/Select an event/)
  })

  it('returns a draft and records usage for an admin', async () => {
    mockGetTokens.mockResolvedValue({ decodedToken: { uid: 'admin1', admin: true } })
    mockGenerateBlogDraft.mockResolvedValue(successResult)
    mockIncrementUsage.mockResolvedValue({})

    const { POST } = await import('@/app/api/admin/blog/generate/route')
    const req = new Request('http://localhost/api/admin/blog/generate', {
      method: 'POST',
      body: JSON.stringify({ type: 'weekly-digest', selectedItems: [{ id: '1', title: 'T', url: 'https://x.com/a', source: 'x', snippet: 's' }] }),
    })
    const res = await POST(req as unknown as Request)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.draftId).toBe('draft-1')
    expect(body.usage.totalTokens).toBe(15)
    expect(mockIncrementUsage).toHaveBeenCalledWith('admin1', 15)
  })

  it('passes normalized input to generateBlogDraft', async () => {
    mockGetTokens.mockResolvedValue({ decodedToken: { uid: 'admin1', admin: true } })
    mockGenerateBlogDraft.mockResolvedValue(successResult)
    mockIncrementUsage.mockResolvedValue({})

    const { POST } = await import('@/app/api/admin/blog/generate/route')
    const req = new Request('http://localhost/api/admin/blog/generate', {
      method: 'POST',
      body: JSON.stringify({ type: 'weekly-digest', selectedItems: [{ id: '1', title: 'T', url: 'https://x.com/a', source: 'x', snippet: 's' }] }),
    })
    await POST(req as unknown as Request)

    expect(mockGenerateBlogDraft).toHaveBeenCalledTimes(1)
    const [input, uid] = mockGenerateBlogDraft.mock.calls[0]
    expect(uid).toBe('admin1')
    expect(input.type).toBe('weekly-digest')
    expect(input.autoPick).toBe(false)
    expect(input.allCandidates).toBeUndefined()
    expect(input.selectedItems).toEqual([
      { id: '1', title: 'T', url: 'https://x.com/a', source: 'x', publishedAt: undefined, snippet: 's' },
    ])
    expect(input.notes).toBeUndefined()
    expect(input.eventId).toBeUndefined()
  })

  it('returns 500 when generateBlogDraft fails with a generic error', async () => {
    mockGetTokens.mockResolvedValue({ decodedToken: { uid: 'admin1', admin: true } })
    mockGenerateBlogDraft.mockRejectedValue(new Error('draft failed'))

    const { POST } = await import('@/app/api/admin/blog/generate/route')
    const req = new Request('http://localhost/api/admin/blog/generate', {
      method: 'POST',
      body: JSON.stringify({ type: 'weekly-digest', selectedItems: [{ id: '1', title: 'T', url: 'https://x.com/a', source: 'x', snippet: 's' }] }),
    })
    const res = await POST(req as unknown as Request)
    const body = await res.json()

    expect(res.status).toBe(500)
    expect(body.error).toBe('Internal server error')
  })

  it('returns 503 when generateBlogDraft throws an OpenRouterError', async () => {
    mockGetTokens.mockResolvedValue({ decodedToken: { uid: 'admin1', admin: true } })
    mockGenerateBlogDraft.mockRejectedValue(new mockOpenRouterError('AI down'))

    const { POST } = await import('@/app/api/admin/blog/generate/route')
    const req = new Request('http://localhost/api/admin/blog/generate', {
      method: 'POST',
      body: JSON.stringify({ type: 'weekly-digest', selectedItems: [{ id: '1', title: 'T', url: 'https://x.com/a', source: 'x', snippet: 's' }] }),
    })
    const res = await POST(req as unknown as Request)
    const body = await res.json()

    expect(res.status).toBe(503)
    expect(body.error).toBe('AI service error')
  })
})
