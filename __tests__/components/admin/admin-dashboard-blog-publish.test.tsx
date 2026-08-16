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
})
