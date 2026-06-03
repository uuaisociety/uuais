import { render, screen } from '@testing-library/react'
import EventDetailPage from '@/app/events/[id]/page'
import { updatePageMeta } from '@/utils/seo'
import { defaultAppState } from '@/__tests__/helpers/fixtures'

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
    mockUseApp.mockReturnValue({ state: defaultAppState, dispatch: jest.fn() })
    const { container } = render(<EventDetailPage />)
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument()
    expect(screen.queryByText('AI Workshop')).not.toBeInTheDocument()
  })

  it('renders event title and description when found', () => {
    mockUseApp.mockReturnValue({
      state: { ...defaultAppState, events: [mockEvent] },
      dispatch: jest.fn(),
    })
    render(<EventDetailPage />)
    expect(screen.getByText('AI Workshop')).toBeInTheDocument()
    expect(screen.getByText('A great workshop about artificial intelligence')).toBeInTheDocument()
  })

  it('shows upcoming status badge', () => {
    mockUseApp.mockReturnValue({
      state: { ...defaultAppState, events: [mockEvent] },
      dispatch: jest.fn(),
    })
    render(<EventDetailPage />)
    expect(screen.getByText('Upcoming')).toBeInTheDocument()
  })

  it('shows past event status badge for past events', () => {
    const pastEvent = { ...mockEvent, eventStartAt: '2020-03-10T10:00:00Z' }
    mockUseApp.mockReturnValue({
      state: { ...defaultAppState, events: [pastEvent] },
      dispatch: jest.fn(),
    })
    render(<EventDetailPage />)
    expect(screen.getByText('Past Event')).toBeInTheDocument()
  })

  it('shows back button linking to /events', () => {
    mockUseApp.mockReturnValue({
      state: { ...defaultAppState, events: [mockEvent] },
      dispatch: jest.fn(),
    })
    render(<EventDetailPage />)
    expect(screen.getByText('Back to Events')).toBeInTheDocument()
  })

  it('renders event metadata (date, location, category)', () => {
    mockUseApp.mockReturnValue({
      state: { ...defaultAppState, events: [mockEvent] },
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
      state: { ...defaultAppState, events: [mockEvent] },
      dispatch: jest.fn(),
    })
    render(<EventDetailPage />)
    expect(screen.getByText('About This Event')).toBeInTheDocument()
  })

  it('shows registration required block when registrationRequired is true', () => {
    const regEvent = { ...mockEvent, registrationRequired: true, maxCapacity: 50 }
    mockUseApp.mockReturnValue({
      state: { ...defaultAppState, events: [regEvent] },
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
      state: { ...defaultAppState, events: [extEvent] },
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
      state: { ...defaultAppState, events: [extEvent] },
      dispatch: jest.fn(),
    })
    render(<EventDetailPage />)
    expect(screen.getByText('Login to register')).toBeDisabled()
  })

  it('renders related events section', () => {
    mockUseApp.mockReturnValue({
      state: { ...defaultAppState, events: [mockEvent, mockRelated] },
      dispatch: jest.fn(),
    })
    render(<EventDetailPage />)
    expect(screen.getByText('Other Upcoming Events')).toBeInTheDocument()
    expect(screen.getByText('Another Event')).toBeInTheDocument()
  })

  it('shows Event Details card with date, time, location', () => {
    mockUseApp.mockReturnValue({
      state: { ...defaultAppState, events: [mockEvent] },
      dispatch: jest.fn(),
    })
    render(<EventDetailPage />)
    expect(screen.getByText('Event Details')).toBeInTheDocument()
  })

  it('renders featured image when event has image', () => {
    mockUseApp.mockReturnValue({
      state: { ...defaultAppState, events: [mockEvent] },
      dispatch: jest.fn(),
    })
    render(<EventDetailPage />)
    const img = screen.getByAltText('AI Workshop')
    expect(img).toBeInTheDocument()
    expect(img).toHaveAttribute('src', '/images/event.jpg')
  })

  it('calls updatePageMeta on mount when event is found', () => {
    mockUseApp.mockReturnValue({
      state: { ...defaultAppState, events: [mockEvent] },
      dispatch: jest.fn(),
    })
    render(<EventDetailPage />)
    expect(updatePageMeta).toHaveBeenCalledWith('AI Workshop', expect.any(String))
  })

  it('throws notFound when event does not exist', () => {
    mockUseApp.mockReturnValue({
      state: { ...defaultAppState, events: [mockEvent] },
      dispatch: jest.fn(),
    })
    g.__setMockParams?.({ id: 'nonexistent' })
    expect(() => render(<EventDetailPage />)).toThrow('NEXT_NOT_FOUND')
  })

  it('renders HTML description safely with DOMPurify', () => {
    const htmlEvent = {
      ...mockEvent,
      description: '<p>Hello <strong>World</strong></p>',
    }
    mockUseApp.mockReturnValue({
      state: { ...defaultAppState, events: [htmlEvent] },
      dispatch: jest.fn(),
    })
    render(<EventDetailPage />)
    expect(screen.getByText('Hello')).toBeInTheDocument()
    expect(screen.getByText('World')).toBeInTheDocument()
  })

  it('shows TBA for registration capacity when maxCapacity is not set', () => {
    const regEvent = { ...mockEvent, registrationRequired: true }
    mockUseApp.mockReturnValue({
      state: { ...defaultAppState, events: [regEvent] },
      dispatch: jest.fn(),
    })
    render(<EventDetailPage />)
    expect(screen.getByText('Registration Required')).toBeInTheDocument()
    expect(screen.getByText('TBA')).toBeInTheDocument()
  })

  it('formats non-standard category as human-readable', () => {
    const catEvent = {
      ...mockEvent,
      category: 'networking_event',
    }
    mockUseApp.mockReturnValue({
      state: { ...defaultAppState, events: [catEvent] },
      dispatch: jest.fn(),
    })
    render(<EventDetailPage />)
    const matches = screen.getAllByText('Networking Event')
    expect(matches.length).toBe(2)
  })

  it('shows external registration link when user is logged in for members-only external', () => {
    const mockFirebase = jest.requireMock('@/lib/firebase-client') as {
      auth: { onAuthStateChanged: jest.Mock }
    }
    mockFirebase.auth.onAuthStateChanged.mockImplementation((cb: (u: unknown) => void) => {
      cb({ uid: 'user-1' })
      return jest.fn()
    })
    const extEvent = {
      ...mockEvent,
      externalRegistrationUrl: 'https://example.com/member-register',
      externalRegistrationMembersOnly: true,
    }
    mockUseApp.mockReturnValue({
      state: { ...defaultAppState, events: [extEvent] },
      dispatch: jest.fn(),
    })
    render(<EventDetailPage />)
    expect(screen.getByText('External registration')).toBeInTheDocument()
    expect(screen.getByText('Register externally')).toBeInTheDocument()
    const link = screen.getByText('Register externally').closest('a')
    expect(link).toHaveAttribute('href', 'https://example.com/member-register')
  })

  it('shows QR code when user has eligible registration within 48h of event', async () => {
    const mockFirebase = jest.requireMock('@/lib/firebase-client') as {
      auth: { onAuthStateChanged: jest.Mock }
    }
    mockFirebase.auth.onAuthStateChanged.mockImplementation((cb: (u: unknown) => void) => {
      cb({ uid: 'user-1' })
      return jest.fn()
    })
    const mockRegs = jest.requireMock('@/lib/firestore/registrations') as {
      getMyRegistrationForEvent: jest.Mock
    }
    mockRegs.getMyRegistrationForEvent.mockResolvedValue({
      id: 'reg-1',
      status: 'registered',
    })
    const nearFuture = new Date(Date.now() + 60 * 60 * 1000).toISOString()
    const qrEvent = { ...mockEvent, eventStartAt: nearFuture }
    mockUseApp.mockReturnValue({
      state: { ...defaultAppState, events: [qrEvent] },
      dispatch: jest.fn(),
    })
    render(<EventDetailPage />)
    const qr = await screen.findByTestId('qr-code')
    expect(qr).toBeInTheDocument()
  })

  it('calls incrementExternalRegistrationClick when external link is clicked', () => {
    const mockAnalytics = jest.requireMock('@/lib/firestore/analytics') as {
      incrementExternalRegistrationClick: jest.Mock
    }
    const extEvent = {
      ...mockEvent,
      externalRegistrationUrl: 'https://example.com/register',
    }
    mockUseApp.mockReturnValue({
      state: { ...defaultAppState, events: [extEvent] },
      dispatch: jest.fn(),
    })
    render(<EventDetailPage />)
    const link = screen.getByText('Register externally')
    link.click()
    expect(mockAnalytics.incrementExternalRegistrationClick).toHaveBeenCalledWith('event-1')
  })
})
