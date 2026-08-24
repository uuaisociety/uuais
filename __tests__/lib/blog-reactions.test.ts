import { doc, getDoc, setDoc } from 'firebase/firestore'

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  getDoc: jest.fn(),
  setDoc: jest.fn(),
  serverTimestamp: () => ({ _method: 'serverTimestamp' }),
}))

jest.mock('@/lib/firebase-client', () => ({
  db: 'mock-db',
}))

const mockDoc = doc as jest.Mock
const mockGetDoc = getDoc as jest.Mock
const mockSetDoc = setDoc as jest.Mock

function mockSnap(data?: Record<string, unknown>) {
  return { exists: () => Boolean(data), data: () => data ?? {} }
}

describe('blog reactions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockDoc.mockReturnValue('mock-doc-ref')
    localStorage.clear()
  })

  describe('getBlogReactions', () => {
    it('returns counts from the reactions doc', async () => {
      mockGetDoc.mockResolvedValue(mockSnap({ likes: 4, dislikes: 1, shares: 7 }))
      const { getBlogReactions } = await import('@/lib/firestore/blog-reactions')
      expect(await getBlogReactions('p1')).toEqual({ likes: 4, dislikes: 1, shares: 7 })
    })

    it('returns zeros for posts without a reactions doc', async () => {
      mockGetDoc.mockResolvedValue(mockSnap())
      const { getBlogReactions } = await import('@/lib/firestore/blog-reactions')
      expect(await getBlogReactions('p1')).toEqual({ likes: 0, dislikes: 0, shares: 0 })
    })
  })

  describe('applyBlogReaction', () => {
    it('likes a post when the user has not reacted', async () => {
      mockGetDoc.mockResolvedValue(mockSnap({ likes: 3, dislikes: 1, shares: 2 }))
      const { applyBlogReaction } = await import('@/lib/firestore/blog-reactions')
      const result = await applyBlogReaction('p1', 'like', null)
      expect(result.counts).toEqual({ likes: 4, dislikes: 1, shares: 2 })
      expect(result.userChoice).toBe('like')
      expect(localStorage.getItem('blog_reaction_p1')).toBe('like')
      expect(mockSetDoc).toHaveBeenCalledWith(
        'mock-doc-ref',
        expect.objectContaining({ likes: 4, dislikes: 1, shares: 2 }),
        { merge: true }
      )
    })

    it('toggles off when clicking the already-active direction', async () => {
      mockGetDoc.mockResolvedValue(mockSnap({ likes: 3, dislikes: 1, shares: 2 }))
      const { applyBlogReaction } = await import('@/lib/firestore/blog-reactions')
      const result = await applyBlogReaction('p1', 'like', 'like')
      expect(result.counts).toEqual({ likes: 2, dislikes: 1, shares: 2 })
      expect(result.userChoice).toBeNull()
      expect(localStorage.getItem('blog_reaction_p1')).toBe('')
    })

    it('switches from like to dislike', async () => {
      mockGetDoc.mockResolvedValue(mockSnap({ likes: 3, dislikes: 1, shares: 2 }))
      const { applyBlogReaction } = await import('@/lib/firestore/blog-reactions')
      const result = await applyBlogReaction('p1', 'dislike', 'like')
      expect(result.counts).toEqual({ likes: 2, dislikes: 2, shares: 2 })
      expect(result.userChoice).toBe('dislike')
    })

    it('treats missing counts as zero when the doc does not exist yet', async () => {
      mockGetDoc.mockResolvedValue(mockSnap())
      const { applyBlogReaction } = await import('@/lib/firestore/blog-reactions')
      const result = await applyBlogReaction('p1', 'like', null)
      expect(result.counts).toEqual({ likes: 1, dislikes: 0, shares: 0 })
    })
  })

  describe('incrementBlogShare', () => {
    it('counts the first share per device', async () => {
      mockGetDoc.mockResolvedValue(mockSnap({ likes: 1, dislikes: 0, shares: 5 }))
      const { incrementBlogShare } = await import('@/lib/firestore/blog-reactions')
      const counted = await incrementBlogShare('p1')
      expect(counted).toBe(true)
      expect(localStorage.getItem('blog_shared_p1')).toBe('1')
      expect(mockSetDoc).toHaveBeenCalledWith(
        'mock-doc-ref',
        expect.objectContaining({ likes: 1, dislikes: 0, shares: 6 }),
        { merge: true }
      )
    })

    it('does not count a second share from the same device', async () => {
      localStorage.setItem('blog_shared_p1', '1')
      const { incrementBlogShare } = await import('@/lib/firestore/blog-reactions')
      const counted = await incrementBlogShare('p1')
      expect(counted).toBe(false)
      expect(mockSetDoc).not.toHaveBeenCalled()
    })
  })

  describe('getBlogReactionsCounts', () => {
    it('returns counts for multiple ids', async () => {
      mockGetDoc
        .mockResolvedValueOnce(mockSnap({ likes: 1, dislikes: 0, shares: 0 }))
        .mockResolvedValueOnce(mockSnap())
      const { getBlogReactionsCounts } = await import('@/lib/firestore/blog-reactions')
      const result = await getBlogReactionsCounts(['a', 'b'])
      expect(result).toEqual({
        a: { likes: 1, dislikes: 0, shares: 0 },
        b: { likes: 0, dislikes: 0, shares: 0 },
      })
    })
  })
})
