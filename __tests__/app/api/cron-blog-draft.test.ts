import type { NextRequest } from 'next/server'

const mockGenerate = jest.fn()
const mockFetchNews = jest.fn()
const mockCollection = jest.fn()

jest.mock('@/lib/firebase-admin', () => ({
  adminDb: { collection: (...args: unknown[]) => mockCollection(...args) },
}))
jest.mock('@/lib/ai/blog/generate', () => ({
  generateBlogDraft: (...args: unknown[]) => mockGenerate(...args),
}))
jest.mock('@/lib/ai/blog/news', () => ({
  fetchNewsCandidates: (...args: unknown[]) => mockFetchNews(...args),
}))

function makeQueryChain(docs: unknown[] = [], filter?: (d: { data: () => Record<string, unknown> }) => boolean) {
  const chain: Record<string, jest.Mock> = {} as Record<string, jest.Mock>
  chain.where = jest.fn(() => chain)
  chain.limit = jest.fn(() => chain)
  chain.get = jest.fn().mockResolvedValue({ docs: filter ? docs.filter(filter) : docs })
  return chain
}

function makeDoc(date: string, published = true) {
  return { data: () => ({ date, published }) }
}

const CANDIDATES = [
  { id: '1', title: 'Story A', url: 'https://x.com/a', source: 'x.com', snippet: 's' },
  { id: '2', title: 'Story B', url: 'https://x.com/b', source: 'x.com', snippet: 's' },
]

describe('GET /api/cron/blog-draft', () => {
  const originalSecret = process.env.CRON_SECRET

  beforeEach(() => {
    jest.clearAllMocks()
    process.env.CRON_SECRET = 'test-secret'
  })

  afterAll(() => {
    process.env.CRON_SECRET = originalSecret
  })

  const call = async (secretHeader?: string) => {
    const { GET } = await import('@/app/api/cron/blog-draft/route')
    const req = new Request('http://localhost/api/cron/blog-draft', {
      headers: secretHeader ? { Authorization: `Bearer ${secretHeader}` } : {},
    })
    return GET(req as unknown as NextRequest)
  }

  it('returns 401 without a valid secret', async () => {
    const res = await call('wrong-secret')
    expect(res.status).toBe(401)
  })

  it('returns 401 when CRON_SECRET is not configured', async () => {
    process.env.CRON_SECRET = ''
    const res = await call('')
    expect(res.status).toBe(401)
  })

  it('skips when a published AI digest already exists within the last 7 days', async () => {
    mockCollection.mockReturnValue(makeQueryChain([makeDoc(new Date().toISOString().slice(0, 10))]))
    const res = await call('test-secret')
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.skipped).toBe(true)
    expect(mockFetchNews).not.toHaveBeenCalled()
  })

  it('does not let an unpublished draft block the next digest', async () => {
    const today = new Date().toISOString().slice(0, 10)
    // The where('published','==',true) clause is enforced by the query mock, mirroring Firestore.
    mockCollection.mockReturnValue(
      makeQueryChain([makeDoc(today, false), makeDoc('2026-01-01')], (d) => d.data().published === true)
    )
    mockFetchNews.mockResolvedValue({
      candidates: CANDIDATES,
      sources: { feeds: ['x.com'], exa: false },
      warnings: [],
    })
    mockGenerate.mockResolvedValue({ draftId: 'draft-2', usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 } })

    const res = await call('test-secret')
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.draftId).toBe('draft-2')
  })

  it('creates a weekly digest draft from the top candidates', async () => {
    mockCollection.mockReturnValue(makeQueryChain([]))
    mockFetchNews.mockResolvedValue({
      candidates: CANDIDATES,
      sources: { feeds: ['x.com'], exa: false },
      warnings: [],
    })
    mockGenerate.mockResolvedValue({ draftId: 'draft-1', usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 } })

    const res = await call('test-secret')
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.draftId).toBe('draft-1')
    expect(mockGenerate).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'weekly-digest', autoPick: true }),
      'cron'
    )
  })

  it('returns 502 when no news candidates are available', async () => {
    mockCollection.mockReturnValue(makeQueryChain([]))
    mockFetchNews.mockResolvedValue({ candidates: [], sources: { feeds: [], exa: false }, warnings: ['none'] })
    const res = await call('test-secret')
    expect(res.status).toBe(502)
  })

  it('returns 500 when generation fails', async () => {
    mockCollection.mockReturnValue(makeQueryChain([]))
    mockFetchNews.mockResolvedValue({ candidates: CANDIDATES, sources: { feeds: ['x.com'], exa: false }, warnings: [] })
    mockGenerate.mockRejectedValue(new Error('boom'))
    const res = await call('test-secret')
    expect(res.status).toBe(500)
  })
})
