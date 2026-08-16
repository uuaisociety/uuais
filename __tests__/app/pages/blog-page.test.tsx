import { render, screen, fireEvent, within } from '@testing-library/react'
import BlogPage from '@/components/pages/BlogPage'
import { defaultAppState } from '@/__tests__/helpers/fixtures'

const mockUseApp = jest.fn()
jest.mock('@/contexts/AppContext', () => ({
  useApp: () => mockUseApp(),
  AppProvider: ({ children }: { children: React.ReactNode }) => children,
}))

const samplePost = {
  id: 'p1',
  title: 'Test Article',
  excerpt: 'This is an excerpt',
  content: 'Full content here',
  author: 'Alice',
  date: '2026-01-15',
  image: '/test.jpg',
  tags: ['AI', 'ML'],
  published: true,
  readCount: 0,
}

const samplePost2 = {
  id: 'p2',
  title: 'Another Post',
  excerpt: 'Another excerpt',
  content: 'More content',
  author: 'Bob',
  date: '2026-02-01',
  image: '/test2.jpg',
  tags: ['Python'],
  published: true,
  readCount: 0,
}

describe('BlogPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Reset the ?q= state the component mirrors to the URL so search tests don't leak into each other.
    window.history.replaceState(null, '', '/blog')
  })

  it('renders page heading and description', () => {
    mockUseApp.mockReturnValue({ state: defaultAppState, dispatch: jest.fn() })
    render(<BlogPage />)
    expect(screen.getByText('Blog')).toBeInTheDocument()
    expect(screen.getByText(/News and insights/)).toBeInTheDocument()
  })

  it('shows empty state when no blog posts', () => {
    mockUseApp.mockReturnValue({ state: defaultAppState, dispatch: jest.fn() })
    render(<BlogPage />)
    expect(screen.getByText('No articles found')).toBeInTheDocument()
  })

  it('renders featured article', () => {
    mockUseApp.mockReturnValue({
      state: { ...defaultAppState, blogPosts: [samplePost] },
      dispatch: jest.fn(),
    })
    render(<BlogPage />)
    expect(screen.getByText('Featured Article')).toBeInTheDocument()
    expect(screen.getByText('Test Article')).toBeInTheDocument()
    expect(screen.getByText('Alice')).toBeInTheDocument()
  })

  it('groups posts into From the Team and AI News Desk sections', () => {
    mockUseApp.mockReturnValue({
      state: {
        ...defaultAppState,
        blogPosts: [
          { ...samplePost, authorType: 'human' }, // old team post
          { ...samplePost2, authorType: 'human' }, // newest → featured
          { ...samplePost2, id: 'p3', title: 'AI Digest', date: '2026-01-20', authorType: 'ai' },
        ],
      },
      dispatch: jest.fn(),
    })
    render(<BlogPage />)

    const teamHeading = screen.getByRole('heading', { name: 'From the Team' })
    const aiHeading = screen.getByRole('heading', { name: 'AI News Desk' })

    expect(within(teamHeading.parentElement!).getByText('Test Article')).toBeInTheDocument()
    expect(within(teamHeading.parentElement!).queryByText('AI Digest')).not.toBeInTheDocument()
    expect(within(aiHeading.parentElement!).getByText('AI Digest')).toBeInTheDocument()
    expect(within(aiHeading.parentElement!).queryByText('Test Article')).not.toBeInTheDocument()
  })

  it('shows section empty notes with a single post', () => {
    mockUseApp.mockReturnValue({
      state: { ...defaultAppState, blogPosts: [samplePost] },
      dispatch: jest.fn(),
    })
    render(<BlogPage />)
    expect(screen.getByRole('heading', { name: 'From the Team' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'AI News Desk' })).toBeInTheDocument()
    expect(screen.getByText('No articles from the team yet — check back soon.')).toBeInTheDocument()
    expect(screen.getByText('No AI News Desk articles yet — check back soon.')).toBeInTheDocument()
  })

  it('shows an AI News Desk badge on AI posts', () => {
    mockUseApp.mockReturnValue({
      state: {
        ...defaultAppState,
        blogPosts: [{ ...samplePost2, id: 'p3', title: 'AI Digest', authorType: 'ai' }],
      },
      dispatch: jest.fn(),
    })
    render(<BlogPage />)
    // "AI News Desk" appears as the section heading and on the featured post badge.
    expect(screen.getAllByText('AI News Desk').length).toBeGreaterThanOrEqual(2)
  })

  it('uses an admin-featured post as the hero even when it is not the newest', () => {
    mockUseApp.mockReturnValue({
      state: {
        ...defaultAppState,
        blogPosts: [
          { ...samplePost, featured: true }, // older, but pinned by an admin
          samplePost2, // newest
        ],
      },
      dispatch: jest.fn(),
    })
    render(<BlogPage />)
    // The pinned (older) post is the hero; the newest post sits in a section grid.
    expect(screen.getByRole('link', { name: 'Test Article' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Another Post' })).toBeInTheDocument()
    // Only one "Featured" hero tag is rendered (the grid post is not featured).
    expect(screen.getAllByText('Featured').length).toBe(1)
  })

  it('falls back to the newest post as the hero when nothing is pinned', () => {
    mockUseApp.mockReturnValue({
      state: { ...defaultAppState, blogPosts: [samplePost, samplePost2] },
      dispatch: jest.fn(),
    })
    render(<BlogPage />)
    expect(screen.getByRole('link', { name: 'Another Post' })).toBeInTheDocument()
  })

  it('filters posts by search term', () => {
    mockUseApp.mockReturnValue({
      state: { ...defaultAppState, blogPosts: [samplePost, samplePost2] },
      dispatch: jest.fn(),
    })
    render(<BlogPage />)
    fireEvent.click(screen.getByRole('button', { name: 'Search articles' }))
    const searchInput = screen.getByRole('textbox', { name: 'Search articles' })
    fireEvent.change(searchInput, { target: { value: 'Another' } })
    expect(screen.getByText('Another Post')).toBeInTheDocument()
    expect(screen.queryByText('Test Article')).not.toBeInTheDocument()
  })

  it('shows no results message when search has no matches', () => {
    mockUseApp.mockReturnValue({
      state: { ...defaultAppState, blogPosts: [samplePost] },
      dispatch: jest.fn(),
    })
    render(<BlogPage />)
    fireEvent.click(screen.getByRole('button', { name: 'Search articles' }))
    const searchInput = screen.getByRole('textbox', { name: 'Search articles' })
    fireEvent.change(searchInput, { target: { value: 'zzznonexistent' } })
    expect(screen.getByText(/No articles match/)).toBeInTheDocument()
  })

  it('hides unpublished posts', () => {
    mockUseApp.mockReturnValue({
      state: { ...defaultAppState, blogPosts: [{ ...samplePost, published: false }] },
      dispatch: jest.fn(),
    })
    render(<BlogPage />)
    expect(screen.getByText('No articles found')).toBeInTheDocument()
  })
})
