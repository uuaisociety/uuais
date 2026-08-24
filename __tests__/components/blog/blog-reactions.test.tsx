import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import BlogReactions from '@/components/blog/BlogReactions'

const mockGet = jest.fn()
const mockApply = jest.fn()
const mockShare = jest.fn()
const mockStored = jest.fn()
const mockUseAdmin = jest.fn()

jest.mock('@/lib/firestore/blog-reactions', () => ({
  getBlogReactions: (...args: unknown[]) => mockGet(...args),
  applyBlogReaction: (...args: unknown[]) => mockApply(...args),
  incrementBlogShare: (...args: unknown[]) => mockShare(...args),
  getStoredReaction: (...args: unknown[]) => mockStored(...args),
}))

jest.mock('@/hooks/useAdmin', () => ({ useAdmin: () => mockUseAdmin() }))

describe('BlogReactions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseAdmin.mockReturnValue({ user: { uid: 'u1' } })
    mockStored.mockReturnValue(null)
    mockGet.mockResolvedValue({ likes: 5, dislikes: 2, shares: 3 })
    Object.defineProperty(window, 'open', { value: jest.fn(), writable: true })
  })

  it('renders the current reaction counts', async () => {
    render(<BlogReactions postId="p1" />)
    expect(await screen.findByText('5')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    const shareButton = screen.getByRole('button', { name: 'Share this article' })
    expect(shareButton.textContent).toContain('3')
    expect(screen.getByLabelText('Like this article')).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByLabelText('Dislike this article')).toHaveAttribute('aria-pressed', 'false')
  })

  it('likes a post and shows the active state', async () => {
    mockApply.mockResolvedValue({ counts: { likes: 6, dislikes: 2, shares: 3 }, userChoice: 'like' })
    render(<BlogReactions postId="p1" />)
    await screen.findByText('5')
    fireEvent.click(screen.getByLabelText('Like this article'))
    await waitFor(() => expect(mockApply).toHaveBeenCalledWith('p1', 'like', null))
    expect(await screen.findByText('6')).toBeInTheDocument()
    expect(screen.getByLabelText('Like this article')).toHaveAttribute('aria-pressed', 'true')
  })

  it('restores an existing choice on mount and toggles it off', async () => {
    mockStored.mockReturnValue('like')
    mockApply.mockResolvedValue({ counts: { likes: 5, dislikes: 2, shares: 3 }, userChoice: null })
    render(<BlogReactions postId="p1" />)
    expect(await screen.findByLabelText('Like this article')).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(screen.getByLabelText('Like this article'))
    await waitFor(() => expect(mockApply).toHaveBeenCalledWith('p1', 'like', 'like'))
    expect(await screen.findByLabelText('Like this article')).toHaveAttribute('aria-pressed', 'false')
  })

  it('records a share when the LinkedIn button is clicked', async () => {
    mockShare.mockResolvedValue(true)
    render(<BlogReactions postId="p1" />)
    await screen.findByText('5')
    fireEvent.click(screen.getByRole('button', { name: 'Share this article' }))
    fireEvent.click(screen.getByText('LinkedIn'))
    await waitFor(() => expect(mockShare).toHaveBeenCalledWith('p1'))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Share this article' }).textContent).toContain('4')
    })
    expect(window.open).toHaveBeenCalled()
  })

  it('does not bump the share count when the share was already counted', async () => {
    mockShare.mockResolvedValue(false)
    render(<BlogReactions postId="p1" />)
    await screen.findByText('5')
    fireEvent.click(screen.getByRole('button', { name: 'Share this article' }))
    fireEvent.click(screen.getByText('Post on X'))
    await waitFor(() => expect(mockShare).toHaveBeenCalledWith('p1'))
    const shareButton = screen.getByRole('button', { name: 'Share this article' })
    expect(shareButton.textContent).toContain('3')
  })

  it('shows a sign-in hint and skips the API for anonymous visitors', async () => {
    mockUseAdmin.mockReturnValue({ user: null })
    render(<BlogReactions postId="p1" />)
    await screen.findByText('5')
    fireEvent.click(screen.getByLabelText('Like this article'))
    expect(screen.getByText('Sign in to like or dislike articles.')).toBeInTheDocument()
    expect(mockApply).not.toHaveBeenCalled()
  })
})
