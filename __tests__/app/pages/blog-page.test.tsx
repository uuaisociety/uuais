import { render, screen, fireEvent } from '@testing-library/react'
import BlogPage from '@/components/pages/BlogPage'

const mockUseApp = jest.fn()
jest.mock('@/contexts/AppContext', () => ({
  useApp: () => mockUseApp(),
  AppProvider: ({ children }: { children: React.ReactNode }) => children,
}))

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
  })

  it('renders page heading and description', () => {
    mockUseApp.mockReturnValue({ state: defaultState, dispatch: jest.fn() })
    render(<BlogPage />)
    expect(screen.getByText('Newsletter')).toBeInTheDocument()
    expect(screen.getByText(/Insights, tutorials/)).toBeInTheDocument()
  })

  it('shows empty state when no blog posts', () => {
    mockUseApp.mockReturnValue({ state: defaultState, dispatch: jest.fn() })
    render(<BlogPage />)
    expect(screen.getByText('No articles found')).toBeInTheDocument()
  })

  it('renders featured article', () => {
    mockUseApp.mockReturnValue({
      state: { ...defaultState, blogPosts: [samplePost] },
      dispatch: jest.fn(),
    })
    render(<BlogPage />)
    expect(screen.getByText('Featured Article')).toBeInTheDocument()
    expect(screen.getByText('Test Article')).toBeInTheDocument()
    expect(screen.getByText('Alice')).toBeInTheDocument()
  })

  it('renders latest articles grid', () => {
    mockUseApp.mockReturnValue({
      state: { ...defaultState, blogPosts: [samplePost, samplePost2] },
      dispatch: jest.fn(),
    })
    render(<BlogPage />)
    expect(screen.getByText('Latest Articles')).toBeInTheDocument()
    expect(screen.getByText('Another Post')).toBeInTheDocument()
  })

  it('filters posts by search term', () => {
    mockUseApp.mockReturnValue({
      state: { ...defaultState, blogPosts: [samplePost, samplePost2] },
      dispatch: jest.fn(),
    })
    render(<BlogPage />)
    const searchInput = screen.getByPlaceholderText('Search articles...')
    fireEvent.change(searchInput, { target: { value: 'Another' } })
    expect(screen.getByText('Another Post')).toBeInTheDocument()
    expect(screen.queryByText('Test Article')).not.toBeInTheDocument()
  })

  it('shows no results message when search has no matches', () => {
    mockUseApp.mockReturnValue({
      state: { ...defaultState, blogPosts: [samplePost] },
      dispatch: jest.fn(),
    })
    render(<BlogPage />)
    const searchInput = screen.getByPlaceholderText('Search articles...')
    fireEvent.change(searchInput, { target: { value: 'zzznonexistent' } })
    expect(screen.getByText(/No articles match/)).toBeInTheDocument()
  })

  it('hides unpublished posts', () => {
    mockUseApp.mockReturnValue({
      state: { ...defaultState, blogPosts: [{ ...samplePost, published: false }] },
      dispatch: jest.fn(),
    })
    render(<BlogPage />)
    expect(screen.getByText('No articles found')).toBeInTheDocument()
  })
})
