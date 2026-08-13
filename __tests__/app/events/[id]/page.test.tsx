import { render, screen } from '@testing-library/react'
import EventDetailPage, { generateMetadata } from '@/app/events/[id]/page'

jest.mock('@/lib/firebase-admin', () => ({
  adminDb: {},
}))

jest.mock('@/lib/server-events', () => ({
  getEventByIdServer: jest.fn(),
  getRelatedEventsServer: jest.fn(),
}))

jest.mock('@/app/metadata', () => ({
  SITE_URL: 'https://uuais.com',
}))

jest.mock('dompurify', () => ({
  sanitize: (input: string) => input,
}))

jest.mock('@/components/events/EventDetailClient', () => ({
  __esModule: true,
  default: () => <div data-testid="event-detail-client" />,
}))

const mockGetEventByIdServer = jest.requireMock('@/lib/server-events').getEventByIdServer as jest.Mock
const mockGetRelatedEventsServer = jest.requireMock('@/lib/server-events').getRelatedEventsServer as jest.Mock

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

const params = (id: string) => Promise.resolve({ id })

async function renderPage(id: string) {
  const element = await EventDetailPage({ params: params(id) })
  return render(element)
}

describe('EventDetailPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetEventByIdServer.mockResolvedValue(mockEvent)
    mockGetRelatedEventsServer.mockResolvedValue([])
  })

  it('renders event title and description from server data', async () => {
    await renderPage('event-1')
    expect(mockGetEventByIdServer).toHaveBeenCalledWith('event-1')
    expect(screen.getByText('AI Workshop')).toBeInTheDocument()
    expect(screen.getByText('A great workshop about artificial intelligence')).toBeInTheDocument()
  })

  it('server-renders full content without a loading skeleton', async () => {
    const { container } = await renderPage('event-1')
    expect(container.querySelector('.animate-pulse')).not.toBeInTheDocument()
    expect(screen.getByText('AI Workshop')).toBeInTheDocument()
  })

  it('shows upcoming status badge', async () => {
    await renderPage('event-1')
    expect(screen.getByText('Upcoming')).toBeInTheDocument()
  })

  it('shows past event status badge for past events', async () => {
    mockGetEventByIdServer.mockResolvedValue({ ...mockEvent, eventStartAt: '2020-03-10T10:00:00Z' })
    await renderPage('event-1')
    expect(screen.getByText('Past Event')).toBeInTheDocument()
  })

  it('shows back button linking to /events', async () => {
    await renderPage('event-1')
    expect(screen.getByText('Back to Events')).toBeInTheDocument()
  })

  it('renders event metadata (date, location, category)', async () => {
    await renderPage('event-1')
    expect(screen.getByText('Saturday, June 15, 2030')).toBeInTheDocument()
    // Time is rendered in UTC (TZ pinned in jest.config.ts); 14:00Z renders as 14:00.
    const times = screen.getAllByText('14:00')
    expect(times.length).toBeGreaterThanOrEqual(1)
    const rooms = screen.getAllByText('Room 101')
    expect(rooms.length).toBeGreaterThanOrEqual(1)
  })

  it('renders "About This Event" section', async () => {
    await renderPage('event-1')
    expect(screen.getByText('About This Event')).toBeInTheDocument()
  })

  it('renders related events section', async () => {
    mockGetRelatedEventsServer.mockResolvedValue([mockRelated])
    await renderPage('event-1')
    expect(screen.getByText('Other Upcoming Events')).toBeInTheDocument()
    expect(screen.getByText('Another Event')).toBeInTheDocument()
  })

  it('shows Event Details card with date, time, location', async () => {
    await renderPage('event-1')
    expect(screen.getByText('Event Details')).toBeInTheDocument()
  })

  it('renders featured image when event has image', async () => {
    await renderPage('event-1')
    const img = screen.getByAltText('AI Workshop')
    expect(img).toBeInTheDocument()
    expect(img).toHaveAttribute('src', '/images/event.jpg')
  })

  it('calls notFound when event does not exist', async () => {
    mockGetEventByIdServer.mockResolvedValue(null)
    await expect(EventDetailPage({ params: params('nonexistent') })).rejects.toThrow('NEXT_NOT_FOUND')
  })

  it('renders HTML description safely with DOMPurify', async () => {
    mockGetEventByIdServer.mockResolvedValue({
      ...mockEvent,
      description: '<p>Hello <strong>World</strong></p>',
    })
    await renderPage('event-1')
    expect(screen.getByText('Hello')).toBeInTheDocument()
    expect(screen.getByText('World')).toBeInTheDocument()
  })

  it('shows TBA for registration capacity when maxCapacity is not set', async () => {
    mockGetEventByIdServer.mockResolvedValue({ ...mockEvent, registrationRequired: true })
    await renderPage('event-1')
    expect(screen.getByText('Registration')).toBeInTheDocument()
    expect(screen.getByText('TBA')).toBeInTheDocument()
  })

  it('formats non-standard category as human-readable', async () => {
    mockGetEventByIdServer.mockResolvedValue({
      ...mockEvent,
      category: 'networking_event',
    })
    await renderPage('event-1')
    const matches = screen.getAllByText('Networking Event')
    expect(matches.length).toBe(2)
  })

  it('delegates interactive registration/external/QR blocks to EventDetailClient', async () => {
    mockGetEventByIdServer.mockResolvedValue({ ...mockEvent, registrationRequired: true })
    await renderPage('event-1')
    expect(screen.getByTestId('event-detail-client')).toBeInTheDocument()
  })

  it('emits Event JSON-LD structured data with the event name', async () => {
    const { container } = await renderPage('event-1')
    const script = container.querySelector('script[type="application/ld+json"]')
    expect(script).toBeInTheDocument()
    const json = JSON.parse(script!.textContent || '{}')
    expect(json['@type']).toBe('Event')
    expect(json.name).toBe('AI Workshop')
    expect(json.startDate).toBe('2030-06-15T14:00:00Z')
    expect(json.location.name).toBe('Room 101')
  })

  it('generates metadata with title, description and canonical URL', async () => {
    const meta = await generateMetadata({ params: params('event-1') })
    expect(meta.title).toBe('AI Workshop')
    expect(meta.description).toBe('A great workshop about artificial intelligence')
    expect(meta.alternates).toEqual({ canonical: 'https://uuais.com/events/event-1' })
  })

  it('falls back to generic title in metadata when event is missing', async () => {
    mockGetEventByIdServer.mockResolvedValue(null)
    const meta = await generateMetadata({ params: params('missing') })
    expect(meta.title).toBe('Event')
  })
})
