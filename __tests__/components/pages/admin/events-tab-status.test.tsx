import { render, screen } from '@testing-library/react'
import EventsTab from '@/components/pages/admin/tabs/EventsTab'
import { NotificationsProvider } from '@/components/ui/Notifications'
import { createMockEvent } from '../../../helpers/fixtures'

// The tab reaches Firestore at import time; CI has no keys.
jest.mock('@/lib/firebase-client', () => ({ auth: {}, db: {} }))

const renderTab = () =>
  render(
    <NotificationsProvider>
      <EventsTab />
    </NotificationsProvider>
  )

const withEvents = (events: unknown[]) => {
  global.__setAppState({ events, isLoading: false, error: null })
}

describe('EventsTab — upcoming/past badge', () => {
  afterEach(() => {
    global.__setAppState(null)
  })

  it('shows an event whose start date has passed as past, even when the stored status still says upcoming', () => {
    withEvents([
      createMockEvent({
        id: 'past-event',
        title: 'Last Year Workshop',
        status: 'upcoming',
        eventStartAt: '2020-01-15T18:00:00Z',
      }),
    ])

    renderTab()

    expect(screen.getByText('past')).toBeInTheDocument()
    expect(screen.queryByText('upcoming')).not.toBeInTheDocument()
  })

  it('still shows a future event as upcoming', () => {
    withEvents([
      createMockEvent({
        id: 'future-event',
        title: 'Next Year Workshop',
        eventStartAt: '2099-06-15T18:00:00Z',
      }),
    ])

    renderTab()

    expect(screen.getByText('upcoming')).toBeInTheDocument()
  })
})
