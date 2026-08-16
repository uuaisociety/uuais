import { render, screen, fireEvent } from '@testing-library/react'
import BlogDetailPage from '@/components/pages/BlogDetailPage'
import { updatePageMeta } from '@/utils/seo'
import { incrementBlogRead } from '@/lib/firestore/analytics'
import { previewImageFor } from '@/lib/blog-preview'

jest.mock('@/lib/firestore/analytics', () => ({
  incrementBlogRead: jest.fn(() => Promise.resolve()),
}))

// The reasoning trace is admin-only — render as an admin for this suite.
jest.mock('@/hooks/useAdmin', () => ({
  useAdmin: () => ({
    user: null,
    loading: false,
    isAdmin: true,
    isSuperAdmin: true,
    claims: null,
    signInWithGoogle: jest.fn(),
    logout: jest.fn(),
  }),
}))

jest.mock('@/components/blog/BlogReactions', () => () => (
  <div data-testid="blog-reactions">Reactions widget</div>
))

jest.mock('dompurify', () => ({
  sanitize: (input: string) => input,
}))

const g = global as {
  __setAppState?: (state: Record<string, unknown> | null) => void
  __setMockParams?: (params: Record<string, string>) => void
}

const defaultState = {
  events: [],
  teamMembers: [],
  blogPosts: [],
  blogPostsLoaded: true,
  faqs: [],
  jobs: [],
  boardPositions: [],
  applicants: [],
  registrationQuestions: [],
  isLoading: false,
  error: null,
}

const mockPost = {
  id: 'post-1',
  title: 'AI in Healthcare',
  author: 'John Doe',
  date: '2026-01-15',
  tags: ['AI', 'Healthcare'],
  excerpt: 'An excerpt about AI in healthcare',
  image: '/images/ai-healthcare.jpg',
  content: '<p>HTML content here</p>',
  published: true,
}

const mockRelated = {
  id: 'post-2',
  title: 'Machine Learning Basics',
  author: 'Jane Smith',
  date: '2026-02-01',
  tags: ['ML'],
  excerpt: 'Basics of machine learning',
  image: '/images/ml-basics.jpg',
  content: '<p>ML content</p>',
  published: true,
}

const mockPostNoImage = {
  ...mockPost,
  id: 'post-3',
  image: undefined,
  tags: [],
}

describe('BlogDetailPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    g.__setMockParams?.({ id: 'post-1' })
    g.__setAppState?.(null)
  })

  it('shows loading skeleton while blog posts are still loading', () => {
    g.__setAppState?.({ ...defaultState, blogPosts: [], blogPostsLoaded: false })
    const { container } = render(<BlogDetailPage />)
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument()
    expect(screen.queryByText('AI in Healthcare')).not.toBeInTheDocument()
  })

  it('shows notFound once loaded when the post does not exist', () => {
    g.__setAppState?.({ ...defaultState, blogPosts: [], blogPostsLoaded: true })
    expect(() => render(<BlogDetailPage />)).toThrow('NEXT_NOT_FOUND')
  })

  it('calls notFound when post with given id does not exist', () => {
    g.__setAppState?.({ ...defaultState, blogPosts: [mockRelated] })
    expect(() => render(<BlogDetailPage />)).toThrow('NEXT_NOT_FOUND')
  })

  it('renders blog post title, author, and date', () => {
    g.__setAppState?.({ ...defaultState, blogPosts: [mockPost] })
    render(<BlogDetailPage />)
    expect(screen.getByText('AI in Healthcare')).toBeInTheDocument()
    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('January 15, 2026')).toBeInTheDocument()
  })

  it('renders excerpt', () => {
    g.__setAppState?.({ ...defaultState, blogPosts: [mockPost] })
    render(<BlogDetailPage />)
    expect(screen.getByText('An excerpt about AI in healthcare')).toBeInTheDocument()
  })

  it('renders tags', () => {
    g.__setAppState?.({ ...defaultState, blogPosts: [mockPost] })
    render(<BlogDetailPage />)
    expect(screen.getByText('AI')).toBeInTheDocument()
    expect(screen.getByText('Healthcare')).toBeInTheDocument()
  })

  it('does not render tags section when tags are empty', () => {
    g.__setAppState?.({ ...defaultState, blogPosts: [mockPostNoImage] })
    g.__setMockParams?.({ id: 'post-3' })
    render(<BlogDetailPage />)
    expect(screen.queryByText('AI')).not.toBeInTheDocument()
  })

  it('renders featured image when post has image', () => {
    g.__setAppState?.({ ...defaultState, blogPosts: [mockPost] })
    render(<BlogDetailPage />)
    const img = screen.getByAltText('AI in Healthcare')
    expect(img).toBeInTheDocument()
    expect(img).toHaveAttribute('src', '/images/ai-healthcare.jpg')
  })

  it('falls back to a curated preview image when the post has no image', () => {
    g.__setAppState?.({ ...defaultState, blogPosts: [mockPostNoImage] })
    g.__setMockParams?.({ id: 'post-3' })
    render(<BlogDetailPage />)
    const img = screen.getByAltText('AI in Healthcare')
    expect(img).toHaveAttribute('src', previewImageFor('post-3'))
  })

  it('renders HTML content sanitized via DOMPurify', () => {
    g.__setAppState?.({ ...defaultState, blogPosts: [mockPost] })
    render(<BlogDetailPage />)
    expect(screen.getByText('HTML content here')).toBeInTheDocument()
  })

  it('renders the reactions widget section', () => {
    g.__setAppState?.({ ...defaultState, blogPosts: [mockPost] })
    render(<BlogDetailPage />)
    expect(screen.getByText('React to this article')).toBeInTheDocument()
    expect(screen.getByTestId('blog-reactions')).toBeInTheDocument()
  })

  it('renders related posts section when other published posts exist', () => {
    g.__setAppState?.({ ...defaultState, blogPosts: [mockPost, mockRelated] })
    render(<BlogDetailPage />)
    expect(screen.getByText('Related Posts')).toBeInTheDocument()
    expect(screen.getByText('Machine Learning Basics')).toBeInTheDocument()
  })

  it('hides the Related Posts section when no related posts exist', () => {
    g.__setAppState?.({ ...defaultState, blogPosts: [mockPost] })
    render(<BlogDetailPage />)
    expect(screen.queryByText('Related Posts')).not.toBeInTheDocument()
    expect(screen.queryByText('Read More')).not.toBeInTheDocument()
  })

  it('renders back to blog button', () => {
    g.__setAppState?.({ ...defaultState, blogPosts: [mockPost] })
    render(<BlogDetailPage />)
    expect(screen.getByText('Back to Blog')).toBeInTheDocument()
  })

  it('renders AI disclosure box for AI posts with a mailto reviewer link', () => {
    const mockAIPost = { ...mockPost, authorType: 'ai', reviewedBy: 'Sarah Admin' }
    g.__setAppState?.({ ...defaultState, blogPosts: [mockAIPost] })
    render(<BlogDetailPage />)
    expect(screen.getByText(/Generated by AI/)).toBeInTheDocument()
    const reviewer = screen.getByRole('link', { name: 'Sarah Admin' })
    expect(reviewer).toHaveAttribute('href', 'mailto:sarah.admin@uuais.com')
  })

  it('does not render disclosure box for human posts', () => {
    g.__setAppState?.({ ...defaultState, blogPosts: [mockPost] })
    render(<BlogDetailPage />)
    expect(screen.queryByText(/Generated by AI/)).not.toBeInTheDocument()
  })

  it('renders sources for AI posts', () => {
    const mockAIPost2 = {
      ...mockPost,
      authorType: 'ai',
      sources: [
        { title: 'OpenAI Blog', url: 'https://openai.com/blog' },
        { title: 'DeepMind', url: 'https://deepmind.google/blog' },
      ],
    }
    g.__setAppState?.({ ...defaultState, blogPosts: [mockAIPost2] })
    render(<BlogDetailPage />)
    expect(screen.getByRole('heading', { name: 'Sources' })).toBeInTheDocument()
    const openAILink = screen.getByRole('link', { name: /OpenAI Blog/ })
    expect(openAILink).toHaveAttribute('href', 'https://openai.com/blog')
    const deepMindLink = screen.getByRole('link', { name: /DeepMind/ })
    expect(deepMindLink).toHaveAttribute('href', 'https://deepmind.google/blog')
  })

  it('renders related events when relatedEventIds match', () => {
    const mockPostWithEvents = { ...mockPost, relatedEventIds: ['e1'] }
    g.__setAppState?.({
      ...defaultState,
      blogPosts: [mockPostWithEvents],
      events: [
        {
          id: 'e1',
          title: 'AI Night',
          description: 'An evening of AI talks',
          location: 'Ångström',
          image: '/images/ai-night.jpg',
          category: 'workshop',
          status: 'upcoming',
          registrationRequired: false,
          eventStartAt: '2026-03-01T18:00:00Z',
        },
      ],
    })
    render(<BlogDetailPage />)
    expect(screen.getByText('Related Events')).toBeInTheDocument()
    expect(screen.getByText('AI Night')).toBeInTheDocument()
    const eventLink = screen.getByRole('link', { name: /AI Night/ })
    expect(eventLink).toHaveAttribute('href', '/events/e1')
  })

  it('does not render related events when none match', () => {
    g.__setAppState?.({ ...defaultState, blogPosts: [mockPost] })
    render(<BlogDetailPage />)
    expect(screen.queryByText('Related Events')).not.toBeInTheDocument()
  })

  it('calls incrementBlogRead on mount with blog id', () => {
    g.__setAppState?.({ ...defaultState, blogPosts: [mockPost] })
    render(<BlogDetailPage />)
    expect(incrementBlogRead).toHaveBeenCalledWith('post-1')
  })

  it('calls updatePageMeta when post is found', () => {
    g.__setAppState?.({ ...defaultState, blogPosts: [mockPost] })
    render(<BlogDetailPage />)
    expect(updatePageMeta).toHaveBeenCalledWith(
      'AI in Healthcare',
      'An excerpt about AI in healthcare',
    )
  })

  it('finds a post by slug', () => {
    const postWithSlug = { ...mockPost, slug: 'ai-in-healthcare' }
    g.__setAppState?.({ ...defaultState, blogPosts: [postWithSlug] })
    g.__setMockParams?.({ id: 'ai-in-healthcare' })
    render(<BlogDetailPage />)
    expect(screen.getByText('AI in Healthcare')).toBeInTheDocument()
    expect(incrementBlogRead).toHaveBeenCalledWith('post-1')
  })

  it('prefers the postId prop over the route param', () => {
    const slugPost = { ...mockPost, id: 'post-slugged', slug: 'ai-in-healthcare' }
    g.__setAppState?.({ ...defaultState, blogPosts: [slugPost] })
    g.__setMockParams?.({ id: 'ai-in-healthcare' })
    render(<BlogDetailPage postId="ai-in-healthcare" />)
    expect(screen.getByText('AI in Healthcare')).toBeInTheDocument()
    expect(incrementBlogRead).toHaveBeenCalledWith('post-slugged')
  })

  it('shows the model name on AI posts', () => {
    const aiPost = { ...mockPost, authorType: 'ai', aiModel: 'openai/gpt-4o-mini' }
    g.__setAppState?.({ ...defaultState, blogPosts: [aiPost] })
    render(<BlogDetailPage />)
    expect(screen.getByText('openai/gpt-4o-mini')).toBeInTheDocument()
  })

  it('hides the model name on human posts', () => {
    g.__setAppState?.({ ...defaultState, blogPosts: [mockPost] })
    render(<BlogDetailPage />)
    expect(screen.queryByText('openai/gpt-4o-mini')).not.toBeInTheDocument()
  })

  it('shows a collapsible reasoning trace for AI posts', () => {
    const aiPost = {
      ...mockPost,
      authorType: 'ai',
      aiModel: 'openai/gpt-4o-mini',
      reasoningTrace: 'Step 1: evaluate candidates.\nStep 2: pick top stories.',
    }
    g.__setAppState?.({ ...defaultState, blogPosts: [aiPost] })
    render(<BlogDetailPage />)

    const toggle = screen.getByText('View full reasoning trace')
    expect(toggle).toBeInTheDocument()
    expect(screen.queryByText(/Step 1: evaluate candidates/)).not.toBeInTheDocument()

    fireEvent.click(toggle)
    expect(screen.getByText(/Step 1: evaluate candidates/)).toBeInTheDocument()

    fireEvent.click(screen.getByText('Hide full reasoning trace'))
    expect(screen.queryByText(/Step 1: evaluate candidates/)).not.toBeInTheDocument()
  })

  it('does not render the reasoning trace for posts without one', () => {
    g.__setAppState?.({ ...defaultState, blogPosts: [mockPost] })
    render(<BlogDetailPage />)
    expect(screen.queryByText(/reasoning trace/i)).not.toBeInTheDocument()
  })
})
