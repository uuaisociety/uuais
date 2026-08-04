import { render, screen } from '@testing-library/react'
import HomePage from '@/components/pages/HomePage'
import { defaultAppState } from '@/__tests__/helpers/fixtures'

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
    expect(screen.getByText('Welcome to UU AI Society')).toBeInTheDocument()
    expect(screen.getByText('Build the future.')).toBeInTheDocument()
  })

  it('renders feature cards section', () => {
    mockUseApp.mockReturnValue({ state: defaultAppState, dispatch: jest.fn() })
    render(<HomePage />)
    expect(screen.getByText('Why Join UU AI Society?')).toBeInTheDocument()
    expect(screen.getByText('AI Knowledge')).toBeInTheDocument()
    expect(screen.getByText('Community')).toBeInTheDocument()
    expect(screen.getByText('Innovation')).toBeInTheDocument()
    expect(screen.getByText('Industry Connections')).toBeInTheDocument()
  })

  it('renders CTA buttons', () => {
    mockUseApp.mockReturnValue({ state: defaultAppState, dispatch: jest.fn() })
    render(<HomePage />)
    expect(screen.getByText('Our Events')).toBeInTheDocument()
    expect(screen.getByText('Learn more')).toBeInTheDocument()
  })

  it('renders upcoming events section heading', () => {
    mockUseApp.mockReturnValue({ state: defaultAppState, dispatch: jest.fn() })
    render(<HomePage />)
    expect(screen.getByText('Upcoming Events')).toBeInTheDocument()
  })

  it('shows empty events message when no upcoming events', () => {
    mockUseApp.mockReturnValue({ state: defaultAppState, dispatch: jest.fn() })
    render(<HomePage />)
    expect(screen.getByText('No events found. Please check back later.')).toBeInTheDocument()
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
    expect(screen.getByText('View All Events')).toBeInTheDocument()
  })

  it('renders community showcase section heading', () => {
    mockUseApp.mockReturnValue({ state: defaultAppState, dispatch: jest.fn() })
    render(<HomePage />)
    expect(screen.getByText('What members are building')).toBeInTheDocument()
    expect(screen.getByText('View Showcase')).toBeInTheDocument()
  })

  it('shows empty showcase message when no projects', () => {
    mockUseApp.mockReturnValue({ state: defaultAppState, dispatch: jest.fn() })
    render(<HomePage />)
    expect(
      screen.getByText("No showcase projects yet. Be the first to share what you're building.")
    ).toBeInTheDocument()
  })

  it('renders showcase project cards', () => {
    const project = {
      id: 'p1',
      title: 'Course Navigator',
      description: 'Explore UU courses.',
      category: 'app',
      creatorUserId: 'u1',
      creatorName: 'Ada',
      links: {},
      tags: [],
      votes: 5,
      published: true,
      featured: false,
      createdAt: '2026-07-01T00:00:00Z',
      updatedAt: '2026-07-01T00:00:00Z',
    }
    mockUseApp.mockReturnValue({
      state: { ...defaultAppState, showcaseProjects: [project] },
      dispatch: jest.fn(),
    })
    render(<HomePage />)
    expect(screen.getByText('Course Navigator')).toBeInTheDocument()
    expect(screen.getByText('Apps')).toBeInTheDocument()
    expect(screen.getByText(/By Ada/)).toBeInTheDocument()
  })
})
