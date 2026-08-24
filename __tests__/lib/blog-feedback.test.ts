import { fetchEngagementFeedback } from '@/lib/ai/blog/feedback'

const mockCollection = jest.fn()
jest.mock('@/lib/firebase-admin', () => ({
  adminDb: { collection: (...args: unknown[]) => mockCollection(...args) },
}))

const postsSnapshot = (docs: { id: string; data: () => Record<string, unknown> }[]) => ({ docs })

// Chainable Firestore query mock (where/orderBy/limit all return the query).
const queryResult = (snapshot: unknown) => ({
  where: jest.fn(() => queryResult(snapshot)),
  orderBy: jest.fn(() => queryResult(snapshot)),
  limit: jest.fn(() => queryResult(snapshot)),
  get: jest.fn().mockResolvedValue(snapshot),
})

const docGet = (value: { exists: boolean; data?: () => Record<string, unknown> }) => ({
  get: jest.fn().mockResolvedValue(value),
})

describe('fetchEngagementFeedback', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('formats engagement metrics for recent AI posts', async () => {
    mockCollection.mockImplementation((name: string) => {
      if (name === 'blogPosts') {
        return queryResult(
          postsSnapshot([
            { id: 'p1', data: () => ({ title: 'Weekly Digest', date: '2026-08-14', authorType: 'ai' }) },
            { id: 'p2', data: () => ({ title: 'Event Recap', date: '2026-08-07', authorType: 'ai' }) },
          ])
        )
      }
      if (name === 'analyticsBlogs') {
        return { doc: jest.fn(() => docGet({ exists: true, data: () => ({ reads: 42 }) })) }
      }
      return { doc: jest.fn(() => docGet({ exists: true, data: () => ({ likes: 9, dislikes: 1, shares: 4 }) })) }
    })

    const result = await fetchEngagementFeedback(6)
    expect(result).toContain('"Weekly Digest" (2026-08-14)')
    expect(result).toContain('reads 42, likes 9, dislikes 1, shares 4')
    expect(result).toContain('"Event Recap" (2026-08-07)')
  })

  it('returns a placeholder when no AI posts exist yet', async () => {
    mockCollection.mockImplementation(() => queryResult(postsSnapshot([])))
    const result = await fetchEngagementFeedback(6)
    expect(result).toMatch(/no published AI News Desk posts yet/i)
  })

  it('treats missing metric docs as zeros', async () => {
    mockCollection.mockImplementation((name: string) => {
      if (name === 'blogPosts') {
        return queryResult(postsSnapshot([{ id: 'p1', data: () => ({ title: 'Post', date: '2026-08-14' }) }]))
      }
      return { doc: jest.fn(() => docGet({ exists: false })) }
    })
    const result = await fetchEngagementFeedback(6)
    expect(result).toContain('reads 0, likes 0, dislikes 0, shares 0')
  })

  it('degrades gracefully when the query fails', async () => {
    mockCollection.mockImplementation(() => ({
      where: jest.fn(() => ({ get: jest.fn().mockRejectedValue(new Error('down')) })),
    }))
    const result = await fetchEngagementFeedback(6)
    expect(result).toBe('(engagement data unavailable)')
  })
})
