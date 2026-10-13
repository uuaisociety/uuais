import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import EventsPage from '@/components/pages/EventsPage';
import { useEventArchive } from '@/contexts/useEventArchive';
import { getEvents, getPastEventsPage } from '@/lib/firestore/events';
import { defaultAppState, createMockEvent } from '@/__tests__/helpers/fixtures';

jest.mock('@/contexts/AppContext', () => ({
  useApp: () => ({ state: defaultAppState, eventArchive: useEventArchive() }),
}));
jest.mock('@/lib/firestore/events', () => ({
  getEvents: jest.fn(),
  getPastEventsPage: jest.fn(),
}));

function Harness() {
  return <EventsPage />;
}

const events = Array.from({ length: 20 }, (_, index) =>
  createMockEvent({
    id: `past-${index}`,
    title: `Archive event ${index}`,
    description:
      index === 19 ? 'Rare historical search match' : 'Archived workshop',
    eventStartAt: new Date(Date.UTC(2020, 0, 30 - index)).toISOString(),
  }),
);

beforeEach(() => jest.clearAllMocks());

it('fetches pages on demand and fetches the full archive only for an actual search', async () => {
  const firstCursor = { id: 'past-8' };
  (getPastEventsPage as jest.Mock)
    .mockResolvedValueOnce({
      events: events.slice(0, 9),
      cursor: firstCursor,
      hasMore: true,
    })
    .mockResolvedValueOnce({
      events: events.slice(9, 18),
      cursor: { id: 'past-17' },
      hasMore: true,
    })
    .mockResolvedValueOnce({
      events: events.slice(18),
      cursor: { id: 'past-19' },
      hasMore: false,
    });
  (getEvents as jest.Mock).mockResolvedValue(events);
  render(<Harness />);
  expect(getPastEventsPage).not.toHaveBeenCalled();
  expect(getEvents).not.toHaveBeenCalled();

  fireEvent.click(screen.getByRole('button', { name: 'Past Events' }));
  await waitFor(() =>
    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(9),
  );
  expect(getPastEventsPage).toHaveBeenCalledTimes(1);
  expect(getEvents).not.toHaveBeenCalled();
  expect(
    screen.queryByRole('heading', { name: 'Archive event 19' }),
  ).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Load events' }));
  await waitFor(() =>
    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(18),
  );
  expect(getPastEventsPage).toHaveBeenLastCalledWith(
    expect.objectContaining({ cursor: firstCursor }),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Load events' }));
  await waitFor(() =>
    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(20),
  );
  expect(
    screen.queryByRole('button', { name: 'Load events' }),
  ).not.toBeInTheDocument();
  expect(getEvents).not.toHaveBeenCalled();

  fireEvent.change(screen.getByRole('searchbox'), { target: { value: '   ' } });
  expect(getEvents).not.toHaveBeenCalled();
  fireEvent.change(screen.getByRole('searchbox'), {
    target: { value: 'Rare historical' },
  });
  await waitFor(() =>
    expect(
      screen.getByRole('heading', { name: 'Archive event 19' }),
    ).toBeInTheDocument(),
  );
  expect(getEvents).toHaveBeenCalledTimes(1);
  fireEvent.change(screen.getByRole('searchbox'), {
    target: { value: 'Archive' },
  });
  await waitFor(() =>
    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(9),
  );
  expect(getEvents).toHaveBeenCalledTimes(1);
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: '' } });
  expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(9);
  expect(getPastEventsPage).toHaveBeenCalledTimes(3);
});

it('paginates categories without fetching full search data and retries a failed first page', async () => {
  (getPastEventsPage as jest.Mock)
    .mockRejectedValueOnce(new Error('offline'))
    .mockResolvedValueOnce({
      events: events.slice(0, 2),
      cursor: null,
      hasMore: false,
    })
    .mockResolvedValueOnce({ events: [], cursor: null, hasMore: false });
  render(<Harness />);
  fireEvent.click(screen.getByRole('button', { name: 'Past Events' }));
  await screen.findByRole('button', { name: 'Retry loading events' });
  fireEvent.click(screen.getByRole('button', { name: 'Retry loading events' }));
  await waitFor(() =>
    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(2),
  );
  fireEvent.change(screen.getByRole('combobox'), {
    target: { value: 'guest_lecture' },
  });
  await screen.findByText('No past events match your search criteria.');
  expect(getPastEventsPage).toHaveBeenLastCalledWith(
    expect.objectContaining({ category: 'guest_lecture', cursor: null }),
  );
  expect(getEvents).not.toHaveBeenCalled();
});
