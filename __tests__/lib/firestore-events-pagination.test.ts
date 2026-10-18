const mockGetDocs = jest.fn();
const mockQuery = jest.fn((...args: unknown[]) => args);
const mockWhere = jest.fn((...args: unknown[]) => ({ type: 'where', args }));
const mockOrderBy = jest.fn((...args: unknown[]) => ({
  type: 'orderBy',
  args,
}));
const mockLimit = jest.fn((count: number) => ({ type: 'limit', count }));
const mockStartAfter = jest.fn((cursor: unknown) => ({
  type: 'startAfter',
  cursor,
}));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(() => 'events'),
  query: (...args: unknown[]) => mockQuery(...args),
  where: (...args: unknown[]) => mockWhere(...args),
  orderBy: (...args: unknown[]) => mockOrderBy(...args),
  limit: (count: number) => mockLimit(count),
  startAfter: (cursor: unknown) => mockStartAfter(cursor),
  getDocs: (...args: unknown[]) => mockGetDocs(...args),
  addDoc: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  setDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  serverTimestamp: jest.fn(),
  onSnapshot: jest.fn(),
}));
jest.mock('@/lib/firebase-client', () => ({ db: {} }));

import { getPastEventsPage } from '@/lib/firestore/events';

const doc = (id: string, eventStartAt: string, publishAt?: string) => ({
  id,
  data: () => ({
    id,
    title: id,
    description: '',
    location: '',
    category: 'workshop',
    eventStartAt,
    publishAt,
    published: true,
  }),
});

describe('getPastEventsPage', () => {
  beforeEach(() => jest.clearAllMocks());

  it('queries only published past-window documents with a nine-document cursor page', async () => {
    const asOf = new Date('2026-10-13T12:00:00Z');
    mockGetDocs.mockResolvedValueOnce({
      docs: [doc('old', '2026-10-12T12:00:00Z')],
    });
    const page = await getPastEventsPage({ asOf, category: 'workshop' });
    expect(mockWhere).toHaveBeenCalledWith('published', '==', true);
    expect(mockWhere).toHaveBeenCalledWith('eventStartAt', '<=', '2026-10-15');
    expect(mockWhere).toHaveBeenCalledWith('category', '==', 'workshop');
    expect(mockOrderBy).toHaveBeenCalledWith('eventStartAt', 'desc');
    expect(mockLimit).toHaveBeenCalledWith(9);
    expect(page.events.map(({ id }) => id)).toEqual(['old']);
  });

  it('advances by the last scanned document when scheduled records are filtered', async () => {
    const scanned = Array.from({ length: 9 }, (_, index) =>
      doc(
        `item-${index}`,
        index === 0 ? '2026-10-12T12:00:00Z' : '2026-10-14T12:00:00Z',
      ),
    );
    const next = doc('next', '2026-10-11T12:00:00Z');
    mockGetDocs
      .mockResolvedValueOnce({ docs: scanned })
      .mockResolvedValueOnce({ docs: [next] });
    const result = await getPastEventsPage({
      asOf: new Date('2026-10-13T12:00:00Z'),
    });
    expect(result.events.map(({ id }) => id)).toEqual(['item-0', 'next']);
    expect(result.cursor).toBe(next);
    expect(mockStartAfter).toHaveBeenCalledWith(scanned[8]);
  });

  it('propagates query failures so callers can retry', async () => {
    mockGetDocs.mockRejectedValueOnce(new Error('offline'));
    await expect(getPastEventsPage({ asOf: new Date() })).rejects.toThrow(
      'offline',
    );
  });

  it('only reads the remaining page slots after skipping hidden records', async () => {
    const hidden = doc('hidden', '2026-10-14T12:00:00Z');
    const visible = Array.from({ length: 8 }, (_, index) =>
      doc(`past-${index}`, '2026-10-12T12:00:00Z'),
    );
    const ninth = doc('ninth', '2026-10-11T12:00:00Z');
    const tenth = doc('tenth', '2026-10-10T12:00:00Z');
    mockGetDocs
      .mockResolvedValueOnce({ docs: [hidden, ...visible] })
      .mockResolvedValueOnce({ docs: [ninth] })
      .mockResolvedValueOnce({ docs: [tenth] });
    const asOf = new Date('2026-10-13T12:00:00Z');
    const first = await getPastEventsPage({ asOf });
    expect(first.events).toHaveLength(9);
    expect(first.cursor).toBe(ninth);
    expect(mockLimit.mock.calls.map(([size]) => size)).toEqual([9, 1]);
    const second = await getPastEventsPage({ asOf, cursor: first.cursor });
    expect(mockStartAfter).toHaveBeenLastCalledWith(ninth);
    expect(second.events.map(({ id }) => id)).toEqual(['tenth']);
  });
});
