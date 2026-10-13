import { act, renderHook, waitFor } from '@testing-library/react';
import { getEvents, getPastEventsPage } from '@/lib/firestore/events';
import { useEventArchive } from '@/contexts/useEventArchive';

jest.mock('@/lib/firestore/events', () => ({
  getEvents: jest.fn(),
  getPastEventsPage: jest.fn(),
}));

const page = (id: string) => ({
  events: [{ id } as never],
  cursor: { id } as never,
  hasMore: true,
});

describe('useEventArchive', () => {
  beforeEach(() => jest.clearAllMocks());

  it('does not read until requested and coalesces page and full-search requests', async () => {
    let resolvePage!: (value: ReturnType<typeof page>) => void;
    (getPastEventsPage as jest.Mock).mockReturnValue(
      new Promise((resolve) => {
        resolvePage = resolve;
      }),
    );
    (getEvents as jest.Mock).mockResolvedValue([{ id: 'search' }]);
    const { result } = renderHook(() => useEventArchive());
    expect(getPastEventsPage).not.toHaveBeenCalled();
    expect(getEvents).not.toHaveBeenCalled();

    let first!: Promise<void>;
    let second!: Promise<void>;
    act(() => {
      first = result.current.loadMore('all');
      second = result.current.loadMore('all');
    });
    await waitFor(() => expect(getPastEventsPage).toHaveBeenCalledTimes(1));
    await act(async () => resolvePage(page('past-1')));
    await Promise.all([first, second]);
    expect(result.current.pages.all?.events).toEqual([{ id: 'past-1' }]);

    let searchOne!: Promise<unknown>;
    let searchTwo!: Promise<unknown>;
    act(() => {
      searchOne = result.current.ensureSearchEvents();
      searchTwo = result.current.ensureSearchEvents();
    });
    await act(async () => {
      await Promise.all([searchOne, searchTwo]);
    });
    await act(async () => {
      await result.current.ensureSearchEvents();
    });
    expect(getEvents).toHaveBeenCalledTimes(1);
  });

  it('retains page errors for retry and retries failed full searches', async () => {
    (getPastEventsPage as jest.Mock)
      .mockRejectedValueOnce(new Error('page failed'))
      .mockResolvedValue(page('retry'));
    (getEvents as jest.Mock)
      .mockRejectedValueOnce(new Error('search failed'))
      .mockResolvedValue([{ id: 'found' }]);
    const { result } = renderHook(() => useEventArchive());
    await act(async () => {
      await result.current.loadMore('all');
    });
    expect(result.current.pages.all?.error).toBe('page failed');
    await act(async () => {
      await result.current.loadMore('all');
    });
    expect(result.current.pages.all?.events).toEqual([{ id: 'retry' }]);

    await act(async () => {
      await result.current.ensureSearchEvents();
    });
    expect(result.current.searchError).toBe('search failed');
    await act(async () => {
      await result.current.ensureSearchEvents();
    });
    await waitFor(() =>
      expect(result.current.searchEvents).toEqual([{ id: 'found' }]),
    );
    expect(getEvents).toHaveBeenCalledTimes(2);
  });
});
