import { doc, getDoc, deleteDoc } from 'firebase/firestore'
import { removeUsedNewsUrls } from '@/lib/firestore/blog-seen'

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  getDoc: jest.fn(),
  deleteDoc: jest.fn(),
  setDoc: jest.fn(),
  collection: jest.fn(),
  query: (...args: unknown[]) => args,
  where: (...args: unknown[]) => args,
  orderBy: (...args: unknown[]) => args,
  limit: (...args: unknown[]) => args,
  getDocs: jest.fn(),
  addDoc: jest.fn(),
  updateDoc: jest.fn(),
  onSnapshot: jest.fn(() => () => {}),
  serverTimestamp: () => ({ _method: 'serverTimestamp' }),
}))

jest.mock('@/lib/firebase-client', () => ({
  db: 'mock-db',
}))

jest.mock('@/lib/firestore/blog-seen', () => ({
  removeUsedNewsUrls: jest.fn(),
}))

const mockDoc = doc as jest.Mock
const mockGetDoc = getDoc as jest.Mock
const mockDeleteDoc = deleteDoc as jest.Mock
const mockRemoveUsed = removeUsedNewsUrls as jest.Mock

describe('deleteBlogPost', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockDoc.mockReturnValue('mock-post-ref')
  })

  it('releases the deleted post’s cited URLs from the used store', async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        title: 'Weekly Digest',
        authorType: 'ai',
        sources: [
          { title: 'Story A', url: 'https://openai.com/story-a' },
          { title: 'Story B', url: 'https://deepmind.google/story-b' },
        ],
      }),
    })

    const { deleteBlogPost } = await import('@/lib/firestore/blog')
    await deleteBlogPost('post-1')

    expect(mockDeleteDoc).toHaveBeenCalledWith('mock-post-ref')
    expect(mockRemoveUsed).toHaveBeenCalledWith(['https://openai.com/story-a', 'https://deepmind.google/story-b'])
  })

  it('deletes without touching the used store when the post has no sources', async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ title: 'Manual Post', author: 'Alice', sources: undefined }),
    })

    const { deleteBlogPost } = await import('@/lib/firestore/blog')
    await deleteBlogPost('post-2')

    expect(mockDeleteDoc).toHaveBeenCalledWith('mock-post-ref')
    expect(mockRemoveUsed).not.toHaveBeenCalled()
  })

  it('still deletes when the post cannot be read', async () => {
    mockGetDoc.mockRejectedValue(new Error('permission denied'))
    const { deleteBlogPost } = await import('@/lib/firestore/blog')
    await deleteBlogPost('post-3')
    expect(mockDeleteDoc).toHaveBeenCalledWith('mock-post-ref')
  })
})
