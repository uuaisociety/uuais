import { createAuthMocks } from '@/__tests__/helpers/mocks'

const mockGenerateStream = jest.fn()
const mockFetchNews = jest.fn()
const mockIncrementUsage = jest.fn()
const { mockGetTokens, authEdgeFactory, authConfigFactory } = createAuthMocks()
jest.mock('next-firebase-auth-edge', () => authEdgeFactory)
jest.mock('@/lib/auth-config', () => authConfigFactory)
jest.mock('@/lib/ai/blog/generate', () => ({
  generateBlogDraftStream: (...args: unknown[]) => mockGenerateStream(...args),
}))
jest.mock('@/lib/ai/blog/news', () => ({
  fetchNewsCandidates: (...args: unknown[]) => mockFetchNews(...args),
}))
jest.mock('@/lib/ai/rate-limit', () => ({
  incrementUsage: (...args: unknown[]) => mockIncrementUsage(...args),
}))

const DONE_EVENT = { type: 'done', draftId: 'draft-1' }

async function readSse(res: Response): Promise<Record<string, unknown>[]> {
  const text = await res.text()
  return text
    .split('\n\n')
    .map((block) => block.trim())
    .filter((block) => block.startsWith('data:'))
    .map((block) => JSON.parse(block.slice(5).trim()))
}

describe('POST /api/admin/blog/generate/stream', () => {
  beforeEach(() => { jest.clearAllMocks() })

  const call = async (body: string) => {
    const { POST } = await import('@/app/api/admin/blog/generate/stream/route')
    const req = new Request('http://localhost/api/admin/blog/generate/stream', { method: 'POST', body })
    return POST(req as unknown as Request)
  }

  it('returns 401 when not authenticated', async () => {
    mockGetTokens.mockResolvedValue(null)
    const res = await call('{}')
    expect(res.status).toBe(401)
  })

  it('returns 403 when not admin', async () => {
    mockGetTokens.mockResolvedValue({ decodedToken: { uid: 'user', admin: false } })
    const res = await call('{}')
    expect(res.status).toBe(403)
  })

  it('returns 400 for an invalid type', async () => {
    mockGetTokens.mockResolvedValue({ decodedToken: { uid: 'admin1', admin: true } })
    const res = await call(JSON.stringify({ type: 'nope' }))
    expect(res.status).toBe(400)
  })

  it('streams deltas and a done event to the admin', async () => {
    mockGetTokens.mockResolvedValue({ decodedToken: { uid: 'admin1', admin: true } })
    mockFetchNews.mockResolvedValue({
      candidates: [{ id: 'c1', title: 'S', url: 'https://x.com/1', source: 'x.com', snippet: 's' }],
      sources: { feeds: ['x.com'], exa: false },
      warnings: [],
    })
    mockGenerateStream.mockImplementation(async (_input, _uid, emit) => {
      emit({ type: 'status', text: 'Drafting…' })
      emit({ type: 'delta', text: 'Weekly digest' })
      return { ok: true, draftId: 'draft-1', usage: { promptTokens: 5, completionTokens: 5, totalTokens: 10 } }
    })
    mockIncrementUsage.mockResolvedValue({})

    const res = await call(JSON.stringify({ type: 'weekly-digest', autoPick: true, selectedItems: [] }))
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toMatch(/text\/event-stream/)
    const events = await readSse(res)

    expect(events).toEqual([
      { type: 'status', text: 'Drafting…' },
      { type: 'delta', text: 'Weekly digest' },
      DONE_EVENT,
    ])
    expect(mockIncrementUsage).toHaveBeenCalledWith('admin1', 10)
  })

  it('auto-fetches candidates when autoPick is set', async () => {
    mockGetTokens.mockResolvedValue({ decodedToken: { uid: 'admin1', admin: true } })
    mockFetchNews.mockResolvedValue({
      candidates: [{ id: 'c1', title: 'S', url: 'https://x.com/1', source: 'x.com', snippet: 's' }],
      sources: { feeds: ['x.com'], exa: false },
      warnings: [],
    })
    mockGenerateStream.mockResolvedValue({ ok: true, draftId: 'draft-1', usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 } })
    mockIncrementUsage.mockResolvedValue({})

    const res = await call(JSON.stringify({ type: 'weekly-digest', autoPick: true, selectedItems: [] }))
    expect(res.status).toBe(200)
    expect(mockFetchNews).toHaveBeenCalledTimes(1)
    expect(mockGenerateStream).toHaveBeenCalledWith(
      expect.objectContaining({ allCandidates: [{ id: 'c1', title: 'S', url: 'https://x.com/1', source: 'x.com', snippet: 's' }] }),
      'admin1',
      expect.any(Function)
    )
  })

  it('emits an error event (with raw output) when generation fails', async () => {
    mockGetTokens.mockResolvedValue({ decodedToken: { uid: 'admin1', admin: true } })
    mockGenerateStream.mockResolvedValue({
      ok: false,
      message: 'The model did not return valid JSON',
      raw: '{"title{ "title":',
    })

    const res = await call(JSON.stringify({ type: 'weekly-digest', autoPick: true, selectedItems: [] }))
    const events = await readSse(res)
    expect(events[0]).toMatchObject({ type: 'error', message: 'The model did not return valid JSON' })
    expect(events[0].raw).toContain('title')
    expect(mockIncrementUsage).not.toHaveBeenCalled()
  })
})
