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
    expect(screen.getByText('Uppsala University · AI Society')).toBeInTheDocument()
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
    expect(screen.getByText('Learn more')).toBeInTheDocument()
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
})
