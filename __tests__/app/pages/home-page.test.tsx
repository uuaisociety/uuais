import { render, screen } from '@testing-library/react'
import HomePage from '@/components/pages/HomePage'
import { defaultAppState, createMockBlogPost } from '@/__tests__/helpers/fixtures'

const mockUseApp = jest.fn()
jest.mock('@/contexts/AppContext', () => ({
  useApp: () => mockUseApp(),
  AppProvider: ({ children }: { children: React.ReactNode }) => children,
}))

describe('HomePage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders hero section', () => {
    mockUseApp.mockReturnValue({ state: defaultAppState, dispatch: jest.fn() })
    render(<HomePage />)
    expect(screen.getByText('Uppsala · AI Society')).toBeInTheDocument()
    expect(screen.getByText('Build the future.')).toBeInTheDocument()
  })

  it('renders feature cards section', () => {
    mockUseApp.mockReturnValue({ state: defaultAppState, dispatch: jest.fn() })
    render(<HomePage />)
    expect(screen.getByText('Join UU AI Society')).toBeInTheDocument()
    expect(screen.getByText('AI knowledge')).toBeInTheDocument()
    expect(screen.getByText('Community')).toBeInTheDocument()
    expect(screen.getByText('Innovation')).toBeInTheDocument()
    expect(screen.getByText('Industry connections')).toBeInTheDocument()
  })

  it('renders CTA buttons', () => {
    mockUseApp.mockReturnValue({ state: defaultAppState, dispatch: jest.fn() })
    render(<HomePage />)
    expect(screen.getByText('Our events')).toBeInTheDocument()
    expect(screen.getByText('Learn about UU AI Society')).toBeInTheDocument()
  })

  it('hero text and CTAs are theme-aware (inverted on the paper slab)', () => {
    global.__setMockTheme?.('light')
    mockUseApp.mockReturnValue({ state: defaultAppState, dispatch: jest.fn() })
    const { container } = render(<HomePage />)

    // Primary CTA: brand red on the light slab, white button on the dark slab
    const primaryCta = screen.getByText('Our events').closest('a')
    expect(primaryCta?.className).toContain('bg-primary')
    expect(primaryCta?.className).toContain('dark:bg-white')
    expect(primaryCta?.className).toContain('dark:text-ink')

    // Muted hero text follows the slab tone via currentColor
    const eyebrow = screen.getByText('Uppsala · AI Society')
    expect(eyebrow.className).toContain('text-foreground/65')

    // The hero slab itself is the shared, theme-aware HeroSplash
    expect(container.querySelector('section')?.className).toContain('bg-card')
  })

  it('renders upcoming events section heading', () => {
    mockUseApp.mockReturnValue({ state: defaultAppState, dispatch: jest.fn() })
    render(<HomePage />)
    expect(screen.getByText('Events')).toBeInTheDocument()
  })

  it('shows empty events message when no upcoming events', () => {
    mockUseApp.mockReturnValue({ state: defaultAppState, dispatch: jest.fn() })
    render(<HomePage />)
    expect(screen.getByText(/No events scheduled/)).toBeInTheDocument()
  })

  it('does not flash the empty events message while events are still loading', () => {
    mockUseApp.mockReturnValue({
      state: { ...defaultAppState, eventsLoaded: false, events: [] },
      dispatch: jest.fn(),
    })
    render(<HomePage />)
    expect(screen.queryByText(/No events scheduled/)).not.toBeInTheDocument()
    expect(screen.getByText('Events')).toBeInTheDocument()
  })

  it('renders upcoming event cards', () => {
    const event = {
      id: 'e1',
      title: 'Test Workshop',
      description: 'A great workshop',
      location: 'Room 1',
      image: '/img.jpg',
      category: 'workshop' as const,
      status: 'upcoming' as const,
      published: true,
      registrationRequired: false,
      eventStartAt: new Date(Date.now() + 86400000 * 7).toISOString(),
    }
    mockUseApp.mockReturnValue({
      state: { ...defaultAppState, events: [event] },
      dispatch: jest.fn(),
    })
    render(<HomePage />)
    expect(screen.getByText('Test Workshop')).toBeInTheDocument()
    expect(screen.getByText('Workshop')).toBeInTheDocument()
    expect(screen.getByText('See all events')).toBeInTheDocument()
  })

  it('renders latest articles when blog posts exist', () => {
    mockUseApp.mockReturnValue({
      state: {
        ...defaultAppState,
        blogPosts: [createMockBlogPost({ id: 'b1', title: 'Weekly AI Digest', authorType: 'ai' })],
      },
      dispatch: jest.fn(),
    })
    render(<HomePage />)
    expect(screen.getByText('Articles')).toBeInTheDocument()
    expect(screen.getByText('Weekly AI Digest')).toBeInTheDocument()
    expect(screen.getByText('Read the blog')).toBeInTheDocument()
  })

  it('hides the articles section when there are no published posts', () => {
    mockUseApp.mockReturnValue({ state: defaultAppState, dispatch: jest.fn() })
    render(<HomePage />)
    expect(screen.queryByText('Articles')).not.toBeInTheDocument()
  })
})
