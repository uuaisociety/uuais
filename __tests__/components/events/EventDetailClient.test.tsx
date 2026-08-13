import { render, screen, waitFor } from '@testing-library/react'
import EventDetailClient from '@/components/events/EventDetailClient'

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

jest.mock('react-qr-code', () => ({
  __esModule: true,
  default: () => <div data-testid="qr-code" />,
}))

jest.mock('@/components/events/EventRegistrationDialog', () => ({
  __esModule: true,
  default: () => <div data-testid="registration-dialog" />,
}))

const mockAuth = jest.requireMock('@/lib/firebase-client').auth as { onAuthStateChanged: jest.Mock }
const mockAnalytics = jest.requireMock('@/lib/firestore/analytics') as {
  incrementEventUniqueClick: jest.Mock
  incrementExternalRegistrationClick: jest.Mock
}
const mockRegistrations = jest.requireMock('@/lib/firestore/registrations') as {
  getMyRegistrationForEvent: jest.Mock
}

const baseEvent = {
  id: 'event-1',
  title: 'AI Workshop',
  description: 'A great workshop',
  location: 'Room 101',
  image: '/images/event.jpg',
  category: 'workshop' as const,
  status: 'upcoming' as const,
  registrationRequired: false,
  published: true,
  eventStartAt: '2030-06-15T14:00:00Z',
}

describe('EventDetailClient', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockAuth.onAuthStateChanged.mockImplementation((cb: (u: unknown) => void) => {
      cb(null)
      return jest.fn()
    })
    mockRegistrations.getMyRegistrationForEvent.mockResolvedValue(null)
  })

  it('renders registration block when registration is required for an upcoming event', () => {
    render(
      <EventDetailClient
        event={{ ...baseEvent, registrationRequired: true, maxCapacity: 50 }}
        relatedEvents={[]}
      />
    )
    expect(screen.getByText('Registration Required')).toBeInTheDocument()
    expect(screen.getByText('Capacity: 50')).toBeInTheDocument()
    expect(screen.getByTestId('registration-dialog')).toBeInTheDocument()
  })

  it('shows external registration link', () => {
    render(
      <EventDetailClient
        event={{
          ...baseEvent,
          externalRegistrationUrl: 'https://example.com/register',
          externalRegistrationMembersOnly: false,
        }}
        relatedEvents={[]}
      />
    )
    expect(screen.getByText('External registration')).toBeInTheDocument()
    expect(screen.getByText('Register externally')).toBeInTheDocument()
  })

  it('shows disabled login button for members-only external registration when not logged in', () => {
    render(
      <EventDetailClient
        event={{
          ...baseEvent,
          externalRegistrationUrl: 'https://example.com/register',
          externalRegistrationMembersOnly: true,
        }}
        relatedEvents={[]}
      />
    )
    expect(screen.getByText('Login to register')).toBeDisabled()
  })

  it('shows external registration link when user is logged in for members-only external', () => {
    mockAuth.onAuthStateChanged.mockImplementation((cb: (u: unknown) => void) => {
      cb({ uid: 'user-1' })
      return jest.fn()
    })
    render(
      <EventDetailClient
        event={{
          ...baseEvent,
          externalRegistrationUrl: 'https://example.com/member-register',
          externalRegistrationMembersOnly: true,
        }}
        relatedEvents={[]}
      />
    )
    expect(screen.getByText('External registration')).toBeInTheDocument()
    const link = screen.getByText('Register externally').closest('a')
    expect(link).toHaveAttribute('href', 'https://example.com/member-register')
  })

  it('calls incrementExternalRegistrationClick when external link is clicked', () => {
    render(
      <EventDetailClient
        event={{
          ...baseEvent,
          externalRegistrationUrl: 'https://example.com/register',
        }}
        relatedEvents={[]}
      />
    )
    const link = screen.getByText('Register externally')
    link.click()
    expect(mockAnalytics.incrementExternalRegistrationClick).toHaveBeenCalledWith('event-1')
  })

  it('calls incrementEventUniqueClick on mount', () => {
    render(<EventDetailClient event={baseEvent} relatedEvents={[]} />)
    expect(mockAnalytics.incrementEventUniqueClick).toHaveBeenCalledWith('event-1')
  })

  it('shows QR code when user has eligible registration within 48h of event', async () => {
    mockAuth.onAuthStateChanged.mockImplementation((cb: (u: unknown) => void) => {
      cb({ uid: 'user-1' })
      return jest.fn()
    })
    mockRegistrations.getMyRegistrationForEvent.mockResolvedValue({
      id: 'reg-1',
      status: 'registered',
    })
    const nearFuture = new Date(Date.now() + 60 * 60 * 1000).toISOString()
    render(
      <EventDetailClient event={{ ...baseEvent, eventStartAt: nearFuture }} relatedEvents={[]} />
    )
    const qr = await waitFor(() => screen.getByTestId('qr-code'))
    expect(qr).toBeInTheDocument()
  })

  it('does not show QR code for ineligible registration (outside 48h window)', async () => {
    mockAuth.onAuthStateChanged.mockImplementation((cb: (u: unknown) => void) => {
      cb({ uid: 'user-1' })
      return jest.fn()
    })
    mockRegistrations.getMyRegistrationForEvent.mockResolvedValue({
      id: 'reg-1',
      status: 'registered',
    })
    const farFuture = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    render(
      <EventDetailClient event={{ ...baseEvent, eventStartAt: farFuture }} relatedEvents={[]} />
    )
    await waitFor(() => expect(mockRegistrations.getMyRegistrationForEvent).toHaveBeenCalled())
    expect(screen.queryByTestId('qr-code')).not.toBeInTheDocument()
  })
})
