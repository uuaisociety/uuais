import { render, screen, fireEvent } from '@testing-library/react'
import AdminDashboard from '@/components/pages/admin/AdminDashboard'
import { defaultAppState, createMockBlogPost } from '@/__tests__/helpers/fixtures'

const mockUseApp = jest.fn()
jest.mock('@/contexts/AppContext', () => ({
  useApp: () => mockUseApp(),
  AppProvider: ({ children }: { children: React.ReactNode }) => children,
}))

jest.mock('@/lib/firestore/users', () => ({
  listUsers: jest.fn().mockResolvedValue([]),
}))

jest.mock('@/components/ui/Notifications', () => ({
  useNotify: () => ({ notify: jest.fn() }),
}))

// AdminDashboard stamps reviewedBy from auth.currentUser; mock the client so
// tests run without Firebase env vars (CI has none).
jest.mock('@/lib/firebase-client', () => ({
  auth: { currentUser: { uid: 'test-admin', displayName: 'Test Admin', email: 'test@uuais.com' } },
}))

const mockAddUsed = jest.fn().mockResolvedValue([])
const mockRemoveUsed = jest.fn().mockResolvedValue([])
jest.mock('@/lib/firestore/blog-seen', () => ({
  addUsedNewsUrls: (...args: unknown[]) => mockAddUsed(...args),
  removeUsedNewsUrls: (...args: unknown[]) => mockRemoveUsed(...args),
}))

describe('AdminDashboard blog publishing', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    localStorage.clear()
  })

  it('persists publishing a draft via the Firestore action', () => {
    const dispatch = jest.fn()
    mockUseApp.mockReturnValue({
      state: {
        ...defaultAppState,
        blogPosts: [createMockBlogPost({ id: 'b1', title: 'Draft Post', published: false })],
      },
      dispatch,
    })

    render(<AdminDashboard />)

    // Navigate to the Blog tab.
    fireEvent.click(screen.getByRole('button', { name: 'Blog' }))
    expect(screen.getByText('Draft Post')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Publish' }))

    expect(dispatch).toHaveBeenCalledWith({
      firestoreAction: 'UPDATE_BLOG_POST',
      payload: expect.objectContaining({ id: 'b1', published: true }),
    })
  })

  it('unpublishes a live post via the Firestore action', () => {
    const dispatch = jest.fn()
    mockUseApp.mockReturnValue({
      state: {
        ...defaultAppState,
        blogPosts: [createMockBlogPost({ id: 'b2', title: 'Live Post', published: true })],
      },
      dispatch,
    })

    render(<AdminDashboard />)
    fireEvent.click(screen.getByRole('button', { name: 'Blog' }))

    fireEvent.click(screen.getByRole('button', { name: 'Unpublish' }))

    expect(dispatch).toHaveBeenCalledWith({
      firestoreAction: 'UPDATE_BLOG_POST',
      payload: expect.objectContaining({ id: 'b2', published: false }),
    })
  })

  it('features a post via the Firestore action', () => {
    const dispatch = jest.fn()
    mockUseApp.mockReturnValue({
      state: {
        ...defaultAppState,
        blogPosts: [createMockBlogPost({ id: 'b3', title: 'Hero Candidate', published: true })],
      },
      dispatch,
    })

    render(<AdminDashboard />)
    fireEvent.click(screen.getByRole('button', { name: 'Blog' }))

    fireEvent.click(screen.getByRole('button', { name: 'Set featured' }))

    expect(dispatch).toHaveBeenCalledWith({
      firestoreAction: 'UPDATE_BLOG_POST',
      payload: expect.objectContaining({ id: 'b3', featured: true }),
    })
  })

  it('marks cited sources as used when publishing an AI post', () => {
    const dispatch = jest.fn()
    const urls = ['https://openai.com/story', 'https://deepmind.google/blog/x']
    mockUseApp.mockReturnValue({
      state: {
        ...defaultAppState,
        blogPosts: [
          createMockBlogPost({
            id: 'b4',
            title: 'AI Draft',
            published: false,
            authorType: 'ai',
            sources: [{ title: 'A', url: urls[0] }, { title: 'B', url: urls[1] }],
          }),
        ],
      },
      dispatch,
    })

    render(<AdminDashboard />)
    fireEvent.click(screen.getByRole('button', { name: 'Blog' }))
    fireEvent.click(screen.getByRole('button', { name: 'Publish' }))

    expect(mockAddUsed).toHaveBeenCalledWith(urls)
  })

  it('releases cited sources when unpublishing an AI post', () => {
    const dispatch = jest.fn()
    const urls = ['https://openai.com/story']
    mockUseApp.mockReturnValue({
      state: {
        ...defaultAppState,
        blogPosts: [
          createMockBlogPost({
            id: 'b5',
            title: 'Live AI Post',
            published: true,
            authorType: 'ai',
            sources: [{ title: 'A', url: urls[0] }],
          }),
        ],
      },
      dispatch,
    })

    render(<AdminDashboard />)
    fireEvent.click(screen.getByRole('button', { name: 'Blog' }))
    fireEvent.click(screen.getByRole('button', { name: 'Unpublish' }))

    expect(mockRemoveUsed).toHaveBeenCalledWith(urls)
  })
})
