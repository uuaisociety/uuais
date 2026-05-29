import { render, screen, fireEvent } from '@testing-library/react'
import EventsPage from '@/components/pages/EventsPage'
import { updatePageMeta } from '@/utils/seo'

const mockUseApp = jest.fn()
jest.mock('@/contexts/AppContext', () => ({
  useApp: () => mockUseApp(),
  AppProvider: ({ children }: { children: React.ReactNode }) => children,
}))

const baseUpcoming = {
  id: 'event-1',
  title: 'Upcoming Workshop',
  description: 'A great workshop about AI',
  location: 'Room 101',
  image: '/images/event1.jpg',
  category: 'workshop' as const,
  status: 'upcoming' as const,
  registrationRequired: false,
  published: true,
  eventStartAt: '2030-06-15T14:00:00Z',
}

const basePast = {
  id: 'event-2',
  title: 'Past Guest Lecture',
  description: 'A past lecture about NLP',
  location: 'Room 202',
  image: '/images/event2.jpg',
  category: 'guest_lecture' as const,
  status: 'past' as const,
  registrationRequired: true,
  maxCapacity: 50,
  currentRegistrations: 30,
  published: true,
  eventStartAt: '2020-03-10T10:00:00Z',
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

describe('EventsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('shows empty state when no events', () => {
    mockUseApp.mockReturnValue({ state: defaultState, dispatch: jest.fn() })
    render(<EventsPage />)
    expect(screen.getByText('No events found')).toBeInTheDocument()
    expect(screen.getByText('No upcoming events match your search criteria.')).toBeInTheDocument()
  })

  it('renders upcoming events', () => {
    mockUseApp.mockReturnValue({
      state: { ...defaultState, events: [baseUpcoming, basePast] },
      dispatch: jest.fn(),
    })
    render(<EventsPage />)
    expect(screen.getByText('Upcoming Workshop')).toBeInTheDocument()
    expect(screen.queryByText('Past Guest Lecture')).not.toBeInTheDocument()
  })

  it('switches to past events tab', () => {
    mockUseApp.mockReturnValue({
      state: { ...defaultState, events: [baseUpcoming, basePast] },
      dispatch: jest.fn(),
    })
    render(<EventsPage />)
    fireEvent.click(screen.getByText('Past Events'))
    expect(screen.getByText('Past Guest Lecture')).toBeInTheDocument()
    expect(screen.queryByText('Upcoming Workshop')).not.toBeInTheDocument()
  })

  it('shows registration badge for upcoming events with registrationRequired', () => {
    const regEvent = { ...baseUpcoming, registrationRequired: true, id: 'event-3' }
    mockUseApp.mockReturnValue({
      state: { ...defaultState, events: [regEvent] },
      dispatch: jest.fn(),
    })
    render(<EventsPage />)
    expect(screen.getByText('Registration Required')).toBeInTheDocument()
  })

  it('filters events by search term', () => {
    mockUseApp.mockReturnValue({
      state: { ...defaultState, events: [baseUpcoming, basePast] },
      dispatch: jest.fn(),
    })
    render(<EventsPage />)
    const searchInput = screen.getByPlaceholderText('Search events...')
    fireEvent.change(searchInput, { target: { value: 'Workshop' } })
    expect(screen.getByText('Upcoming Workshop')).toBeInTheDocument()
    expect(screen.queryByText('Past Guest Lecture')).not.toBeInTheDocument()
  })

  it('filters events by category', () => {
    const lecture = { ...baseUpcoming, category: 'guest_lecture' as const, id: 'event-3', title: 'Guest Lecture' }
    mockUseApp.mockReturnValue({
      state: { ...defaultState, events: [baseUpcoming, lecture] },
      dispatch: jest.fn(),
    })
    render(<EventsPage />)
    const select = screen.getByRole('combobox')
    fireEvent.change(select, { target: { value: 'guest_lecture' } })
    expect(screen.getByRole('heading', { name: 'Guest Lecture' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Upcoming Workshop' })).not.toBeInTheDocument()
  })

  it('shows empty state when search matches nothing', () => {
    mockUseApp.mockReturnValue({
      state: { ...defaultState, events: [baseUpcoming] },
      dispatch: jest.fn(),
    })
    render(<EventsPage />)
    const searchInput = screen.getByPlaceholderText('Search events...')
    fireEvent.change(searchInput, { target: { value: 'zzzznonexistent' } })
    expect(screen.getByText('No events found')).toBeInTheDocument()
  })

  it('renders event metadata (date, time, location)', () => {
    mockUseApp.mockReturnValue({
      state: { ...defaultState, events: [baseUpcoming] },
      dispatch: jest.fn(),
    })
    render(<EventsPage />)
    expect(screen.getByText('Room 101')).toBeInTheDocument()
    const badges = screen.getAllByText('Workshop')
    expect(badges.length).toBeGreaterThanOrEqual(1)
    expect(badges[0]).toBeInTheDocument()
  })

  it('renders capacity for events with maxCapacity', () => {
    const capEvent = { ...baseUpcoming, maxCapacity: 100 }
    mockUseApp.mockReturnValue({
      state: { ...defaultState, events: [capEvent] },
      dispatch: jest.fn(),
    })
    render(<EventsPage />)
    expect(screen.getByText('Capacity: 100')).toBeInTheDocument()
  })

  it('truncates long descriptions', () => {
    const longDesc = 'A'.repeat(150)
    const longEvent = { ...baseUpcoming, description: longDesc }
    mockUseApp.mockReturnValue({
      state: { ...defaultState, events: [longEvent] },
      dispatch: jest.fn(),
    })
    render(<EventsPage />)
    const truncated = 'A'.repeat(100) + '...'
    expect(screen.getByText(truncated)).toBeInTheDocument()
  })

  it('setPageMeta is called on mount', () => {
    mockUseApp.mockReturnValue({ state: defaultState, dispatch: jest.fn() })
    render(<EventsPage />)
    expect(updatePageMeta).toHaveBeenCalledWith(
      'Events',
      expect.stringContaining('Join our upcoming AI workshops')
    )
  })
})
