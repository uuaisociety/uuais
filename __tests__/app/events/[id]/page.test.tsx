import { render, screen } from '@testing-library/react'
import EventDetailPage from '@/app/events/[id]/page'
import { updatePageMeta } from '@/utils/seo'

jest.mock('@/lib/firebase-client', () => ({
  auth: {
    onAuthStateChanged: jest.fn((cb: (u: unknown) => void) => {
      cb(null)
      return jest.fn()
    }),
  },
}))

jest.mock('@/lib/firestore/analytics', () => ({
  incrementEventUniqueClick: jest.fn(() => Promise.resolve()),
  incrementExternalRegistrationClick: jest.fn(() => Promise.resolve()),
}))

jest.mock('@/lib/firestore/registrations', () => ({
  getMyRegistrationForEvent: jest.fn(() => Promise.resolve(null)),
}))

jest.mock('dompurify', () => ({
  sanitize: (input: string) => input,
}))

jest.mock('react-qr-code', () => ({
  __esModule: true,
  default: () => <div data-testid="qr-code" />,
}))

jest.mock('@/components/events/EventRegistrationDialog', () => ({
  __esModule: true,
  default: () => <div data-testid="registration-dialog" />,
}))

const mockUseApp = jest.fn()
jest.mock('@/contexts/AppContext', () => ({
  useApp: () => mockUseApp(),
  AppProvider: ({ children }: { children: React.ReactNode }) => children,
}))

const g = global as { __setMockParams?: (params: Record<string, string>) => void }

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

const mockEvent = {
  id: 'event-1',
  title: 'AI Workshop',
  description: 'A great workshop about artificial intelligence',
  location: 'Room 101',
  image: '/images/event.jpg',
  category: 'workshop' as const,
  status: 'upcoming' as const,
  registrationRequired: false,
  published: true,
  eventStartAt: '2030-06-15T14:00:00Z',
}

const mockRelated = {
  id: 'event-2',
  title: 'Another Event',
  description: 'Another upcoming event',
  location: 'Room 202',
  image: '/images/event2.jpg',
  category: 'guest_lecture' as const,
  status: 'upcoming' as const,
  registrationRequired: false,
  published: true,
  eventStartAt: '2030-07-01T10:00:00Z',
}

describe('EventDetailPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    g.__setMockParams?.({ id: 'event-1' })
  })

  it('shows loading skeleton when events array is empty', () => {
    mockUseApp.mockReturnValue({ state: defaultState, dispatch: jest.fn() })
    const { container } = render(<EventDetailPage />)
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument()
    expect(screen.queryByText('AI Workshop')).not.toBeInTheDocument()
  })

  it('renders event title and description when found', () => {
    mockUseApp.mockReturnValue({
      state: { ...defaultState, events: [mockEvent] },
      dispatch: jest.fn(),
    })
    render(<EventDetailPage />)
    expect(screen.getByText('AI Workshop')).toBeInTheDocument()
    expect(screen.getByText('A great workshop about artificial intelligence')).toBeInTheDocument()
  })

  it('shows upcoming status badge', () => {
    mockUseApp.mockReturnValue({
      state: { ...defaultState, events: [mockEvent] },
      dispatch: jest.fn(),
    })
    render(<EventDetailPage />)
    expect(screen.getByText('Upcoming')).toBeInTheDocument()
  })

  it('shows past event status badge for past events', () => {
    const pastEvent = { ...mockEvent, eventStartAt: '2020-03-10T10:00:00Z' }
    mockUseApp.mockReturnValue({
      state: { ...defaultState, events: [pastEvent] },
      dispatch: jest.fn(),
    })
    render(<EventDetailPage />)
    expect(screen.getByText('Past Event')).toBeInTheDocument()
  })

  it('shows back button linking to /events', () => {
    mockUseApp.mockReturnValue({
      state: { ...defaultState, events: [mockEvent] },
      dispatch: jest.fn(),
    })
    render(<EventDetailPage />)
    expect(screen.getByText('Back to Events')).toBeInTheDocument()
  })

  it('renders event metadata (date, location, category)', () => {
    mockUseApp.mockReturnValue({
      state: { ...defaultState, events: [mockEvent] },
      dispatch: jest.fn(),
    })
    render(<EventDetailPage />)
    expect(screen.getByText('Saturday, June 15, 2030')).toBeInTheDocument()
    const times = screen.getAllByText('16:00')
    expect(times.length).toBeGreaterThanOrEqual(1)
    const rooms = screen.getAllByText('Room 101')
    expect(rooms.length).toBeGreaterThanOrEqual(1)
  })

  it('renders "About This Event" section', () => {
    mockUseApp.mockReturnValue({
      state: { ...defaultState, events: [mockEvent] },
      dispatch: jest.fn(),
    })
    render(<EventDetailPage />)
    expect(screen.getByText('About This Event')).toBeInTheDocument()
  })

  it('shows registration required block when registrationRequired is true', () => {
    const regEvent = { ...mockEvent, registrationRequired: true, maxCapacity: 50 }
    mockUseApp.mockReturnValue({
      state: { ...defaultState, events: [regEvent] },
      dispatch: jest.fn(),
    })
    render(<EventDetailPage />)
    expect(screen.getByText('Registration Required')).toBeInTheDocument()
    expect(screen.getByText('Capacity: 50')).toBeInTheDocument()
  })

  it('shows external registration link', () => {
    const extEvent = {
      ...mockEvent,
      externalRegistrationUrl: 'https://example.com/register',
      externalRegistrationMembersOnly: false,
    }
    mockUseApp.mockReturnValue({
      state: { ...defaultState, events: [extEvent] },
      dispatch: jest.fn(),
    })
    render(<EventDetailPage />)
    expect(screen.getByText('External registration')).toBeInTheDocument()
    expect(screen.getByText('Register externally')).toBeInTheDocument()
  })

  it('shows disabled login button for members-only external registration when not logged in', () => {
    const extEvent = {
      ...mockEvent,
      externalRegistrationUrl: 'https://example.com/register',
      externalRegistrationMembersOnly: true,
    }
    mockUseApp.mockReturnValue({
      state: { ...defaultState, events: [extEvent] },
      dispatch: jest.fn(),
    })
    render(<EventDetailPage />)
    expect(screen.getByText('Login to register')).toBeDisabled()
  })

  it('renders related events section', () => {
    mockUseApp.mockReturnValue({
      state: { ...defaultState, events: [mockEvent, mockRelated] },
      dispatch: jest.fn(),
    })
    render(<EventDetailPage />)
    expect(screen.getByText('Other Upcoming Events')).toBeInTheDocument()
    expect(screen.getByText('Another Event')).toBeInTheDocument()
  })

  it('shows Event Details card with date, time, location', () => {
    mockUseApp.mockReturnValue({
      state: { ...defaultState, events: [mockEvent] },
      dispatch: jest.fn(),
    })
    render(<EventDetailPage />)
    expect(screen.getByText('Event Details')).toBeInTheDocument()
  })

  it('renders featured image when event has image', () => {
    mockUseApp.mockReturnValue({
      state: { ...defaultState, events: [mockEvent] },
      dispatch: jest.fn(),
    })
    render(<EventDetailPage />)
    const img = screen.getByAltText('AI Workshop')
    expect(img).toBeInTheDocument()
    expect(img).toHaveAttribute('src', '/images/event.jpg')
  })

  it('calls updatePageMeta on mount when event is found', () => {
    mockUseApp.mockReturnValue({
      state: { ...defaultState, events: [mockEvent] },
      dispatch: jest.fn(),
    })
    render(<EventDetailPage />)
    expect(updatePageMeta).toHaveBeenCalledWith('AI Workshop', expect.any(String))
  })
})
