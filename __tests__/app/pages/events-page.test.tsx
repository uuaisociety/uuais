import { act, render, screen, fireEvent } from '@testing-library/react';
import EventsPage from '@/components/pages/EventsPage';
import { updatePageMeta } from '@/utils/seo';
import { defaultAppState } from '@/__tests__/helpers/fixtures';
import type { EventArchivePage } from '@/contexts/useEventArchive';
import type { Event } from '@/types';
import { CODEX_AMBASSADOR_INTERVIEW_PUBLISH_AT } from '@/lib/content-publication';
const mockUseApp = jest.fn();
const mockEventArchive = {
  pages: {} as Record<string, EventArchivePage>,
  searchEvents: null as Event[] | null,
  searchLoading: false,
  searchError: null as string | null,
  loadMore: jest.fn(async (category: string) => {
    const page = mockEventArchive.pages[category];
    if (page) page.loading = false;
  }),
  ensureSearchEvents: jest.fn(async () => mockEventArchive.searchEvents),
};
jest.mock('@/contexts/AppContext', () => ({
  useApp: () => ({ eventArchive: mockEventArchive, ...mockUseApp() }),
  AppProvider: ({ children }: { children: React.ReactNode }) => children,
}));

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
};

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
};

const makePastEvents = (count: number) =>
  Array.from({ length: count }, (_, index) => ({
    ...basePast,
    id: `past-${index}`,
    title: `Past #${index}`,
    category: index >= 10 ? ('guest_lecture' as const) : ('workshop' as const),
    eventStartAt: new Date(Date.UTC(2020, 0, index + 1)).toISOString(),
  })).reverse();

describe('EventsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEventArchive.pages = {};
    mockEventArchive.searchEvents = null;
    jest.useFakeTimers({ now: CODEX_AMBASSADOR_INTERVIEW_PUBLISH_AT });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('shows empty state when no events', () => {
    mockUseApp.mockReturnValue({ state: defaultAppState, dispatch: jest.fn() });
    render(<EventsPage />);
    expect(screen.getByText('No events found')).toBeInTheDocument();
    expect(
      screen.getByRole('link', {
        name: 'a conversation with the Codex Ambassador',
      }),
    ).toHaveAttribute('href', '/events/codex-ambassador-interview');
    expect(
      screen.getByText('No upcoming events match your search criteria.'),
    ).toBeInTheDocument();
  });

  it('keeps the interview link hidden before release and reveals it at release while open', () => {
    jest.setSystemTime(CODEX_AMBASSADOR_INTERVIEW_PUBLISH_AT.getTime() - 1);
    mockUseApp.mockReturnValue({ state: defaultAppState, dispatch: jest.fn() });
    render(<EventsPage />);

    expect(
      screen.queryByRole('link', {
        name: 'a conversation with the Codex Ambassador',
      }),
    ).not.toBeInTheDocument();

    act(() => jest.advanceTimersByTime(1));
    expect(
      screen.getByRole('link', {
        name: 'a conversation with the Codex Ambassador',
      }),
    ).toHaveAttribute('href', '/events/codex-ambassador-interview');
  });

  it('clears the pending publication timer when the Events page unmounts', () => {
    jest.setSystemTime(CODEX_AMBASSADOR_INTERVIEW_PUBLISH_AT.getTime() - 1);
    mockUseApp.mockReturnValue({ state: defaultAppState, dispatch: jest.fn() });
    const { unmount } = render(<EventsPage />);

    expect(jest.getTimerCount()).toBeGreaterThan(0);
    unmount();
    expect(jest.getTimerCount()).toBe(0);
  });

  it('does not flash the empty state while events are still loading', () => {
    mockUseApp.mockReturnValue({
      state: { ...defaultAppState, eventsLoaded: false, events: [] },
      dispatch: jest.fn(),
    });
    render(<EventsPage />);
    expect(screen.queryByText('No events found')).not.toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Events', level: 1 }),
    ).toBeInTheDocument();
  });

  it('renders upcoming events', () => {
    mockUseApp.mockReturnValue({
      state: { ...defaultAppState, events: [baseUpcoming, basePast] },
      dispatch: jest.fn(),
    });
    render(<EventsPage />);
    expect(screen.getByText('Upcoming Workshop')).toBeInTheDocument();
    expect(screen.queryByText('Past Guest Lecture')).not.toBeInTheDocument();
  });

  it('switches to past events tab', () => {
    mockEventArchive.pages.all = {
      events: [basePast],
      loading: false,
      error: null,
      hasMore: false,
      loaded: true,
    };
    mockUseApp.mockReturnValue({
      state: { ...defaultAppState, events: [baseUpcoming, basePast] },
      dispatch: jest.fn(),
    });
    render(<EventsPage />);
    fireEvent.click(screen.getByText('Past Events'));
    expect(screen.getByText('Past Guest Lecture')).toBeInTheDocument();
    expect(screen.queryByText('Upcoming Workshop')).not.toBeInTheDocument();
  });

  it('shows the newest nine past events and loads nine more until exhausted', () => {
    mockEventArchive.pages.all = {
      events: makePastEvents(20),
      loading: false,
      error: null,
      hasMore: false,
      loaded: true,
    };
    mockUseApp.mockReturnValue({
      state: { ...defaultAppState, events: makePastEvents(20) },
      dispatch: jest.fn(),
    });
    render(<EventsPage />);
    fireEvent.click(screen.getByText('Past Events'));

    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(9);
    expect(screen.getAllByRole('heading', { level: 2 })[0]).toHaveTextContent(
      'Past #19',
    );
    expect(screen.getByText('Showing 9 of 20 events')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Load events' }));
    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(18);
    expect(screen.getByText('Showing 18 of 20 events')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Load events' }));
    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(20);
    expect(screen.getByText('Showing 20 of 20 events')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Load events' }),
    ).not.toBeInTheDocument();
  });

  it('resets past paging when filters or tabs change and keeps upcoming events unpaged', () => {
    const upcomingLecture = {
      ...baseUpcoming,
      id: 'upcoming-lecture',
      category: 'guest_lecture' as const,
    };
    const events = [...makePastEvents(20), upcomingLecture];
    mockEventArchive.pages.all = {
      events: makePastEvents(20),
      loading: false,
      error: null,
      hasMore: false,
      loaded: true,
    };
    mockEventArchive.pages.guest_lecture = {
      events: makePastEvents(20).filter(
        (event) => event.category === 'guest_lecture',
      ),
      loading: false,
      error: null,
      hasMore: false,
      loaded: true,
    };
    mockEventArchive.searchEvents = makePastEvents(20);
    mockUseApp.mockReturnValue({
      state: { ...defaultAppState, events },
      dispatch: jest.fn(),
    });
    render(<EventsPage />);
    fireEvent.click(screen.getByText('Past Events'));
    fireEvent.click(screen.getByRole('button', { name: 'Load events' }));
    expect(screen.getByText('Showing 18 of 20 events')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('Search events...'), {
      target: { value: 'Past #19' },
    });
    expect(screen.getByText('Showing 1 of 1 events')).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText('Search events...'), {
      target: { value: '' },
    });
    expect(screen.getByText('Showing 9 of 20 events')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Load events' }));
    fireEvent.change(screen.getByRole('combobox'), {
      target: { value: 'guest_lecture' },
    });
    expect(screen.getByText('Showing 9 of 10 events')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Upcoming Events'));
    expect(
      screen.queryByRole('button', { name: 'Load events' }),
    ).not.toBeInTheDocument();
    expect(screen.getByText('1 event')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Past Events'));
    expect(screen.getByText('Showing 9 of 10 events')).toBeInTheDocument();
  });

  it('shows registration badge for upcoming events with registrationRequired', () => {
    const regEvent = {
      ...baseUpcoming,
      registrationRequired: true,
      id: 'event-3',
    };
    mockUseApp.mockReturnValue({
      state: { ...defaultAppState, events: [regEvent] },
      dispatch: jest.fn(),
    });
    render(<EventsPage />);
    expect(screen.getByText('Registration Required')).toBeInTheDocument();
  });

  it('filters events by search term', () => {
    mockEventArchive.searchEvents = [baseUpcoming, basePast];
    mockUseApp.mockReturnValue({
      state: { ...defaultAppState, events: [baseUpcoming, basePast] },
      dispatch: jest.fn(),
    });
    render(<EventsPage />);
    const searchInput = screen.getByPlaceholderText('Search events...');
    fireEvent.change(searchInput, { target: { value: 'Workshop' } });
    expect(screen.getByText('Upcoming Workshop')).toBeInTheDocument();
    expect(screen.queryByText('Past Guest Lecture')).not.toBeInTheDocument();
  });

  it('filters events by category', () => {
    const lecture = {
      ...baseUpcoming,
      category: 'guest_lecture' as const,
      id: 'event-3',
      title: 'Guest Lecture',
    };
    mockUseApp.mockReturnValue({
      state: { ...defaultAppState, events: [baseUpcoming, lecture] },
      dispatch: jest.fn(),
    });
    render(<EventsPage />);
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'guest_lecture' } });
    expect(
      screen.getByRole('heading', { name: 'Guest Lecture' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Upcoming Workshop' }),
    ).not.toBeInTheDocument();
  });

  it('shows empty state when search matches nothing', () => {
    mockEventArchive.searchEvents = [baseUpcoming];
    mockUseApp.mockReturnValue({
      state: { ...defaultAppState, events: [baseUpcoming] },
      dispatch: jest.fn(),
    });
    render(<EventsPage />);
    const searchInput = screen.getByPlaceholderText('Search events...');
    fireEvent.change(searchInput, { target: { value: 'zzzznonexistent' } });
    expect(screen.getByText('No events found')).toBeInTheDocument();
  });

  it('renders event metadata (date, time, location)', () => {
    mockUseApp.mockReturnValue({
      state: { ...defaultAppState, events: [baseUpcoming] },
      dispatch: jest.fn(),
    });
    render(<EventsPage />);
    expect(screen.getByText('Room 101')).toBeInTheDocument();
    const badges = screen.getAllByText('Workshop');
    expect(badges.length).toBeGreaterThanOrEqual(1);
    expect(badges[0]).toBeInTheDocument();
  });

  it('renders capacity for events with maxCapacity', () => {
    const capEvent = { ...baseUpcoming, maxCapacity: 100 };
    mockUseApp.mockReturnValue({
      state: { ...defaultAppState, events: [capEvent] },
      dispatch: jest.fn(),
    });
    render(<EventsPage />);
    expect(screen.getByText('Capacity: 100')).toBeInTheDocument();
  });

  it('truncates long descriptions', () => {
    const longDesc = 'A'.repeat(150);
    const longEvent = { ...baseUpcoming, description: longDesc };
    mockUseApp.mockReturnValue({
      state: { ...defaultAppState, events: [longEvent] },
      dispatch: jest.fn(),
    });
    render(<EventsPage />);
    const truncated = 'A'.repeat(100) + '...';
    expect(screen.getByText(truncated)).toBeInTheDocument();
  });

  it('setPageMeta is called on mount', () => {
    mockUseApp.mockReturnValue({ state: defaultAppState, dispatch: jest.fn() });
    render(<EventsPage />);
    expect(updatePageMeta).toHaveBeenCalledWith(
      'Events',
      expect.stringContaining('Join our upcoming AI workshops'),
    );
  });
});
