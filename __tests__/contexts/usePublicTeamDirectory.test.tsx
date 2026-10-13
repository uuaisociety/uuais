import { act, renderHook, waitFor } from '@testing-library/react';
import { usePublicTeamDirectory } from '@/contexts/usePublicTeamDirectory';

const result = (team: string, year: number | 'all', member: string) => ({
  metadata: {
    years: [2026],
    defaultYear: 2026,
    countsByYear: { all: {}, '2026': {} },
  },
  team,
  year,
  teamMembers: [{ id: member }],
});

describe('usePublicTeamDirectory', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  it('does not load until requested, then caches selected profiles across tabs', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => result('board', 2026, 'board-profile'),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => result('research', 2026, 'research-profile'),
      });
    const { result: hook } = renderHook(() => usePublicTeamDirectory());
    expect(global.fetch).not.toHaveBeenCalled();
    await act(async () => {
      await hook.current.ensureLoaded();
    });
    await waitFor(() =>
      expect(hook.current.directory?.teamMembers[0]?.id).toBe('board-profile'),
    );
    expect(global.fetch).toHaveBeenCalledWith('/api/team');

    act(() => hook.current.loadSelection('research', 2026));
    await waitFor(() =>
      expect(hook.current.directory?.teamMembers[0]?.id).toBe(
        'research-profile',
      ),
    );
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/team?team=research&year=2026',
    );
    act(() => hook.current.loadSelection('board', 2026));
    await waitFor(() =>
      expect(hook.current.directory?.teamMembers[0]?.id).toBe('board-profile'),
    );
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('keeps the selected profile list empty when a selection request fails and supports retry', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => result('board', 2026, 'board-profile'),
      })
      .mockResolvedValueOnce({ ok: false })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => result('research', 2026, 'research-profile'),
      });
    const { result: hook } = renderHook(() => usePublicTeamDirectory());
    await act(async () => {
      await hook.current.ensureLoaded();
    });
    await waitFor(() => expect(hook.current.directory?.team).toBe('board'));
    act(() => hook.current.loadSelection('research', 2026));
    await waitFor(() =>
      expect(hook.current.error).toBe('Could not load team profiles.'),
    );
    expect(hook.current.directory?.teamMembers).toEqual([]);
    act(() => hook.current.retry());
    await waitFor(() =>
      expect(hook.current.directory?.teamMembers[0]?.id).toBe(
        'research-profile',
      ),
    );
  });

  it('deduplicates overlapping selection requests and keeps the latest selection visible', async () => {
    let resolveResearch!: (response: {
      ok: boolean;
      json: () => Promise<ReturnType<typeof result>>;
    }) => void;
    let resolveDevelopment!: (response: {
      ok: boolean;
      json: () => Promise<ReturnType<typeof result>>;
    }) => void;
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => result('board', 2026, 'board-profile'),
      })
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveResearch = resolve;
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveDevelopment = resolve;
          }),
      );
    const { result: hook } = renderHook(() => usePublicTeamDirectory());
    await act(async () => {
      await hook.current.ensureLoaded();
    });
    act(() => {
      hook.current.loadSelection('research', 2026);
      hook.current.loadSelection('development', 2026);
      hook.current.loadSelection('research', 2026);
    });
    expect(global.fetch).toHaveBeenCalledTimes(3);
    await act(async () =>
      resolveDevelopment({
        ok: true,
        json: async () => result('development', 2026, 'dev-profile'),
      }),
    );
    await act(async () =>
      resolveResearch({
        ok: true,
        json: async () => result('research', 2026, 'research-profile'),
      }),
    );
    await waitFor(() =>
      expect(hook.current.directory?.teamMembers[0]?.id).toBe(
        'research-profile',
      ),
    );
    expect(global.fetch).toHaveBeenCalledTimes(3);
  });
});
