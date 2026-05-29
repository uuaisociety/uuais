import { render, screen } from '@testing-library/react'
import BlogDetailPage from '@/app/blog/[id]/page'
import { updatePageMeta } from '@/utils/seo'
import { incrementBlogRead } from '@/lib/firestore/analytics'

jest.mock('@/lib/firestore/analytics', () => ({
  incrementBlogRead: jest.fn(() => Promise.resolve()),
}))

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

  it('shows loading skeleton when blogPosts is empty', () => {
    g.__setAppState?.(defaultState)
    const { container } = render(<BlogDetailPage />)
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument()
    expect(screen.queryByText('AI in Healthcare')).not.toBeInTheDocument()
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

  it('does not render image when post has no image', () => {
    g.__setAppState?.({ ...defaultState, blogPosts: [mockPostNoImage] })
    g.__setMockParams?.({ id: 'post-3' })
    render(<BlogDetailPage />)
    expect(screen.queryByAltText('AI in Healthcare')).not.toBeInTheDocument()
  })

  it('renders HTML content sanitized via DOMPurify', () => {
    g.__setAppState?.({ ...defaultState, blogPosts: [mockPost] })
    render(<BlogDetailPage />)
    expect(screen.getByText('HTML content here')).toBeInTheDocument()
  })

  it('renders related posts section when other published posts exist', () => {
    g.__setAppState?.({ ...defaultState, blogPosts: [mockPost, mockRelated] })
    render(<BlogDetailPage />)
    expect(screen.getByText('Related Posts')).toBeInTheDocument()
    expect(screen.getByText('Machine Learning Basics')).toBeInTheDocument()
  })

  it('renders Related Posts heading even when no related posts exist', () => {
    g.__setAppState?.({ ...defaultState, blogPosts: [mockPost] })
    render(<BlogDetailPage />)
    expect(screen.getByText('Related Posts')).toBeInTheDocument()
    expect(screen.queryByText('Read More')).not.toBeInTheDocument()
  })

  it('renders back to newsletter button', () => {
    g.__setAppState?.({ ...defaultState, blogPosts: [mockPost] })
    render(<BlogDetailPage />)
    expect(screen.getByText('Back to Newsletter')).toBeInTheDocument()
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
})
