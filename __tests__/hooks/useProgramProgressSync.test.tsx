import { renderHook, act, waitFor } from '@testing-library/react';
import { useProgramProgressSync } from '@/hooks/useProgramProgressSync';
import { getManualPassedSnapshot, saveManualPassed } from '@/lib/programs/manual';

const fetchProgramProgress = jest.fn();
const writeProgramPassed = jest.fn().mockResolvedValue(undefined);

jest.mock('@/lib/firestore/program-progress', () => ({
  fetchProgramProgress: (...args: unknown[]) => fetchProgramProgress(...args),
  writeProgramPassed: (...args: unknown[]) => writeProgramPassed(...args),
}));

const signedIn = { user: { uid: 'u1' }, loading: false };

describe('useProgramProgressSync', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    window.localStorage.clear();
    saveManualPassed('TTF2Y', new Set());
    fetchProgramProgress.mockReset();
    writeProgramPassed.mockClear();
    global.__setAdminState(null);
  });

  afterEach(() => {
    jest.useRealTimers();
    global.__setAdminState(null);
  });

  it('leaves the marks local when signed out', async () => {
    saveManualPassed('TTF2Y', new Set(['1MA360']));
    renderHook(() => useProgramProgressSync('TTF2Y'));
    await act(async () => {});
    expect(fetchProgramProgress).not.toHaveBeenCalled();
    expect(getManualPassedSnapshot('TTF2Y')).toEqual(new Set(['1MA360']));
  });

  it('takes the account over the browser on sign-in', async () => {
    saveManualPassed('TTF2Y', new Set(['1MA360', '1TE609']));
    fetchProgramProgress.mockResolvedValue({ TTF2Y: ['1MA360'] });
    global.__setAdminState(signedIn);

    renderHook(() => useProgramProgressSync('TTF2Y'));

    // Un-marking on another device must not be undone by this browser's stale copy.
    await waitFor(() => expect(getManualPassedSnapshot('TTF2Y')).toEqual(new Set(['1MA360'])));
    expect(writeProgramPassed).not.toHaveBeenCalled();
  });

  it('carries existing browser marks up on the first sign-in', async () => {
    saveManualPassed('TTF2Y', new Set(['1MA360']));
    fetchProgramProgress.mockResolvedValue(null);
    global.__setAdminState(signedIn);

    renderHook(() => useProgramProgressSync('TTF2Y'));

    await waitFor(() =>
      expect(writeProgramPassed).toHaveBeenCalledWith('u1', 'TTF2Y', ['1MA360'])
    );
  });

  it('collapses a run of ticks into one write', async () => {
    fetchProgramProgress.mockResolvedValue({});
    global.__setAdminState(signedIn);
    renderHook(() => useProgramProgressSync('TTF2Y'));
    await waitFor(() => expect(fetchProgramProgress).toHaveBeenCalled());

    act(() => {
      saveManualPassed('TTF2Y', new Set(['1MA360']));
      saveManualPassed('TTF2Y', new Set(['1MA360', '1TE609']));
      saveManualPassed('TTF2Y', new Set(['1MA360', '1TE609', '1FA605']));
    });
    expect(writeProgramPassed).not.toHaveBeenCalled();

    await act(async () => {
      jest.advanceTimersByTime(2000);
    });
    expect(writeProgramPassed).toHaveBeenCalledTimes(1);
    expect(writeProgramPassed).toHaveBeenCalledWith('u1', 'TTF2Y', [
      '1FA605',
      '1MA360',
      '1TE609',
    ]);
  });
});
