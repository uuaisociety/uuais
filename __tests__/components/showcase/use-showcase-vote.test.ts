import { renderHook, act, waitFor } from '@testing-library/react';
import { useShowcaseVote } from '@/components/showcase/useShowcaseVote';

jest.mock('@/components/ui/Notifications', () => ({
  useNotify: () => ({ notify: jest.fn() }),
}));

const makeProject = (overrides: Record<string, unknown> = {}) => ({
  id: 'proj-1',
  title: 'Course Navigator',
  description: 'Explore UU courses.',
  category: 'app',
  creatorUserId: 'u1',
  creatorName: 'Ada',
  links: {},
  tags: ['ai'],
  votes: 3,
  published: true,
  featured: false,
  createdAt: '2026-07-01T00:00:00Z',
  updatedAt: '2026-07-01T00:00:00Z',
  ...overrides,
});

const originalFetch = global.fetch;

describe('useShowcaseVote', () => {
  beforeEach(() => {
    window.localStorage.clear();
    jest.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('votesFor does not return NaN for legacy docs missing votes', () => {
    const { result } = renderHook(() => useShowcaseVote('u1'));
    const legacy = makeProject({ votes: undefined });
    expect(result.current.votesFor(legacy as never)).toBe(0);
  });

  it('adds local additions to a project count', () => {
    const { result } = renderHook(() => useShowcaseVote('u1'));
    const project = makeProject({ votes: 3 });
    expect(result.current.votesFor(project)).toBe(3);
  });

  it('marks a project voted on 409 (already voted server-side)', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      status: 409,
      ok: false,
    }) as unknown as typeof fetch;
    const { result } = renderHook(() => useShowcaseVote('u1'));
    await act(async () => {
      await result.current.handleVote(makeProject());
    });
    expect(result.current.voted).toEqual(['proj-1']);
  });

  it('drops a stale local vote when the server returns 409 on DELETE', async () => {
    window.localStorage.setItem('showcaseVoted:u1', JSON.stringify(['proj-1']));
    global.fetch = jest.fn().mockResolvedValue({
      status: 409,
      ok: false,
    }) as unknown as typeof fetch;
    const { result } = renderHook(() => useShowcaseVote('u1'));
    expect(result.current.voted).toEqual(['proj-1']);
    await act(async () => {
      await result.current.handleVote(makeProject());
    });
    // The server already agrees the vote is gone — the client must stop showing it.
    expect(result.current.voted).toEqual([]);
  });

  it('clears a hung in-flight guard when the user changes', async () => {
    let resolveFetch: (v: unknown) => void = () => {};
    const fetchMock = jest.fn(() => new Promise((resolve) => { resolveFetch = resolve; }));
    global.fetch = fetchMock as unknown as typeof fetch;
    const { result, rerender } = renderHook(({ uid }: { uid?: string | null }) => useShowcaseVote(uid), {
      initialProps: { uid: 'u1' },
    });
    let first: Promise<void>;
    await act(async () => {
      first = result.current.handleVote(makeProject());
    });
    expect(result.current.pending).toEqual(['proj-1']);
    // A request still out belongs to the previous user; the new user's buttons must not wait on it.
    rerender({ uid: 'u2' });
    expect(result.current.pending).toEqual([]);
    await act(async () => {
      resolveFetch({ ok: true, status: 200, json: async () => ({ votes: 4 }) });
      await first;
    });
  });

  it('updates votes and persists after a successful vote', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ votes: 4 }),
    }) as unknown as typeof fetch;
    const { result } = renderHook(() => useShowcaseVote('u1'));
    const project = makeProject({ votes: 3 });
    await act(async () => {
      await result.current.handleVote(project);
    });
    expect(result.current.voted).toEqual(['proj-1']);
    expect(result.current.votesFor(project)).toBe(4);
    await waitFor(() => {
      expect(window.localStorage.getItem('showcaseVoted:u1')).toContain('proj-1');
    });
  });

  it('does not double-fire when tapped twice rapidly', async () => {
    let resolveFetch: (v: unknown) => void = () => {};
    const fetchMock = jest.fn(() => new Promise((resolve) => { resolveFetch = resolve; }));
    global.fetch = fetchMock as unknown as typeof fetch;
    const { result } = renderHook(() => useShowcaseVote('u1'));
    const project = makeProject();
    let first: Promise<void>;
    let second: Promise<void>;
    await act(async () => {
      first = result.current.handleVote(project);
      second = result.current.handleVote(project);
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await act(async () => {
      resolveFetch({ ok: true, status: 200, json: async () => ({ votes: 4 }) });
      await Promise.all([first, second]);
    });
  });
});
