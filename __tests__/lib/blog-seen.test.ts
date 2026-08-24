import { doc, getDoc, setDoc, getDocs } from 'firebase/firestore'

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  getDoc: jest.fn(),
  setDoc: jest.fn(),
  getDocs: jest.fn(),
  collection: jest.fn(),
  query: (...args: unknown[]) => args,
  where: (...args: unknown[]) => args,
  serverTimestamp: () => ({ _method: 'serverTimestamp' }),
}))

jest.mock('@/lib/firebase-client', () => ({
  db: 'mock-db',
}))

const mockDoc = doc as jest.Mock
const mockGetDoc = getDoc as jest.Mock
const mockSetDoc = setDoc as jest.Mock
const mockGetDocs = getDocs as jest.Mock

function mockSnap(urls?: string[]) {
  return { exists: () => Boolean(urls), data: () => ({ urls }) }
}

function mockPosts(docs: { data: () => Record<string, unknown> }[]) {
  return { forEach: (fn: (d: { data: () => Record<string, unknown> }) => void) => docs.forEach(fn) }
}

describe('used news URLs (blog-seen)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockDoc.mockReturnValue('mock-doc-ref')
    mockGetDoc.mockResolvedValue(mockSnap(['https://openai.com/story-one']))
  })

  it('reads the used URLs from config/blog_news_seen', async () => {
    const { getUsedNewsUrls } = await import('@/lib/firestore/blog-seen')
    expect(await getUsedNewsUrls()).toEqual(['https://openai.com/story-one'])
  })

  it('adds a new used URL and persists the list', async () => {
    const { addUsedNewsUrl } = await import('@/lib/firestore/blog-seen')
    const next = await addUsedNewsUrl('https://deepmind.google/blog/atom-1')
    expect(next).toEqual(['https://openai.com/story-one', 'https://deepmind.google/blog/atom-1'])
    expect(mockSetDoc).toHaveBeenCalledWith(
      'mock-doc-ref',
      expect.objectContaining({ urls: ['https://openai.com/story-one', 'https://deepmind.google/blog/atom-1'] }),
      { merge: true }
    )
  })

  it('does not add a duplicate URL (normalized)', async () => {
    const { addUsedNewsUrl } = await import('@/lib/firestore/blog-seen')
    const next = await addUsedNewsUrl('https://openai.com/story-one/')
    expect(next).toEqual(['https://openai.com/story-one'])
    expect(mockSetDoc).not.toHaveBeenCalled()
  })

  it('adds multiple URLs at once (publish-time bulk mark)', async () => {
    const { addUsedNewsUrls } = await import('@/lib/firestore/blog-seen')
    const next = await addUsedNewsUrls(['https://openai.com/story-one', 'https://deepmind.google/blog/atom-1', '  '])
    expect(next).toEqual(['https://openai.com/story-one', 'https://deepmind.google/blog/atom-1'])
    expect(mockSetDoc).toHaveBeenCalledWith(
      'mock-doc-ref',
      expect.objectContaining({
        urls: ['https://openai.com/story-one', 'https://deepmind.google/blog/atom-1'],
      }),
      { merge: true }
    )
  })

  it('removes a used URL and persists the list', async () => {
    const { removeUsedNewsUrl } = await import('@/lib/firestore/blog-seen')
    const next = await removeUsedNewsUrl('https://openai.com/story-one')
    expect(next).toEqual([])
    expect(mockSetDoc).toHaveBeenCalledWith('mock-doc-ref', expect.objectContaining({ urls: [] }), { merge: true })
  })

  it('returns the current list when removing an unknown URL', async () => {
    const { removeUsedNewsUrl } = await import('@/lib/firestore/blog-seen')
    const next = await removeUsedNewsUrl('https://other.com/x')
    expect(next).toEqual(['https://openai.com/story-one'])
    expect(mockSetDoc).not.toHaveBeenCalled()
  })

  it('bulk-removes multiple used URLs at once', async () => {
    mockGetDoc.mockResolvedValue(
      mockSnap(['https://openai.com/story-one', 'https://deepmind.google/blog/atom-1'])
    )
    const { removeUsedNewsUrls } = await import('@/lib/firestore/blog-seen')
    const next = await removeUsedNewsUrls(['https://openai.com/story-one', 'https://deepmind.google/blog/atom-1'])
    expect(next).toEqual([])
    expect(mockSetDoc).toHaveBeenCalledWith('mock-doc-ref', expect.objectContaining({ urls: [] }), { merge: true })
  })

  it('returns every covered URL: seen store plus URLs cited by AI posts', async () => {
    mockGetDoc.mockResolvedValue(mockSnap(['https://openai.com/story-one']))
    mockGetDocs.mockResolvedValue(
      mockPosts([
        {
          data: () => ({
            title: 'Weekly Digest',
            sources: [{ url: 'https://openai.com/story-one' }, { url: 'https://deepmind.google/blog/atom-1' }],
          }),
        },
      ])
    )
    const { getCoveredNewsUrls } = await import('@/lib/firestore/blog-seen')
    const covered = await getCoveredNewsUrls()

    const byUrl = Object.fromEntries(covered.map((c) => [c.url, c]))
    expect(byUrl['https://openai.com/story-one'].used).toBe(true)
    expect(byUrl['https://openai.com/story-one'].citedBy).toContain('Weekly Digest')
    expect(byUrl['https://deepmind.google/blog/atom-1'].used).toBe(false)
    expect(byUrl['https://deepmind.google/blog/atom-1'].citedBy).toContain('Weekly Digest')
  })
})
