import { render, screen, fireEvent } from '@testing-library/react'
import UpcomingEventsBanner from '@/components/common/UpcomingEventsBanner'

const g = global as { __setAppState?: (state: Record<string, unknown> | null) => void }

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

const futureEvent = (id: string, days: number) => {
  const d = new Date(Date.now() + days * 86400000)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return {
    id,
    title: `Event ${id}`,
    description: 'Description',
    location: 'Room 101',
    image: '',
    category: 'workshop' as const,
    status: 'upcoming' as const,
    registrationRequired: false,
    published: true,
    eventStartAt: `${y}-${m}-${day}`,
  }
}

describe('UpcomingEventsBanner', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    localStorage.clear()
    g.__setAppState?.(defaultState)
  })

  it('returns null when there are no events', () => {
    const { container } = render(<UpcomingEventsBanner />)
    expect(container.innerHTML).toBe('')
  })

  it('renders event cards for upcoming events within 7 days', () => {
    g.__setAppState?.({ ...defaultState, events: [futureEvent('e1', 1), futureEvent('e2', 3)] })
    render(<UpcomingEventsBanner />)
    expect(screen.getByText('Event e1')).toBeInTheDocument()
    expect(screen.getByText('Event e2')).toBeInTheDocument()
  })

  it('shows singular heading when one event', () => {
    g.__setAppState?.({ ...defaultState, events: [futureEvent('e1', 1)] })
    render(<UpcomingEventsBanner />)
    expect(screen.getByText('Upcoming Event')).toBeInTheDocument()
  })

  it('shows plural heading when multiple events', () => {
    g.__setAppState?.({ ...defaultState, events: [futureEvent('e1', 1), futureEvent('e2', 3)] })
    render(<UpcomingEventsBanner />)
    expect(screen.getByText('Upcoming Events')).toBeInTheDocument()
  })

  it('renders at most 3 events', () => {
    const events = Array.from({ length: 5 }, (_, i) => futureEvent(`e${i}`, i + 1))
    g.__setAppState?.({ ...defaultState, events })
    render(<UpcomingEventsBanner />)
    const titles = screen.getAllByText(/^Event e/)
    expect(titles).toHaveLength(3)
  })

  it('renders dismiss (X) and dont-show-again (EyeOff) buttons', () => {
    g.__setAppState?.({ ...defaultState, events: [futureEvent('e1', 1)] })
    render(<UpcomingEventsBanner />)
    expect(screen.getByTitle("Don't show again for 7 days")).toBeInTheDocument()
    expect(screen.getByTitle('Close')).toBeInTheDocument()
  })

  it('hides banner when dismiss is clicked', () => {
    g.__setAppState?.({ ...defaultState, events: [futureEvent('e1', 1)] })
    render(<UpcomingEventsBanner />)
    expect(screen.getByText('Event e1')).toBeInTheDocument()
    fireEvent.click(screen.getByTitle('Close'))
    expect(screen.queryByText('Event e1')).not.toBeInTheDocument()
  })

  it('hides banner permanently when dont-show-again is clicked', () => {
    g.__setAppState?.({ ...defaultState, events: [futureEvent('e1', 1)] })
    render(<UpcomingEventsBanner />)
    fireEvent.click(screen.getByTitle("Don't show again for 7 days"))
    expect(screen.queryByText('Event e1')).not.toBeInTheDocument()
    expect(localStorage.getItem('eventBannerDismissed')).toBe('true')
  })

  it('shows "View All Events" link', () => {
    g.__setAppState?.({ ...defaultState, events: [futureEvent('e1', 1)] })
    render(<UpcomingEventsBanner />)
    expect(screen.getByText('View All Events')).toBeInTheDocument()
  })
})
