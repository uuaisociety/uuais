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

  it('retries the next change after a write fails', async () => {
    fetchProgramProgress.mockResolvedValue({});
    global.__setAdminState(signedIn);
    renderHook(() => useProgramProgressSync('TTF2Y'));
    await waitFor(() => expect(fetchProgramProgress).toHaveBeenCalled());

    writeProgramPassed.mockRejectedValueOnce(new Error('offline'));
    act(() => {
      saveManualPassed('TTF2Y', new Set(['1MA360']));
    });
    await act(async () => {
      jest.advanceTimersByTime(2000);
    });
    expect(writeProgramPassed).toHaveBeenCalledTimes(1);

    // A failed write must not leave the account permanently out of sync.
    act(() => {
      saveManualPassed('TTF2Y', new Set(['1MA360', '1TE609']));
    });
    await act(async () => {
      jest.advanceTimersByTime(2000);
    });
    expect(writeProgramPassed).toHaveBeenCalledTimes(2);
    expect(writeProgramPassed).toHaveBeenLastCalledWith('u1', 'TTF2Y', ['1MA360', '1TE609']);
  });

  it('keeps this browser\'s marks when the account stores only other programmes', async () => {
    saveManualPassed('TTF2Y', new Set(['1MA360']));
    fetchProgramProgress.mockResolvedValue({ TDV1K: ['1DL201'] });
    global.__setAdminState(signedIn);

    renderHook(() => useProgramProgressSync('TTF2Y'));

    // An absent entry is not an empty one: wiping here loses marks the student made signed out.
    await waitFor(() =>
      expect(writeProgramPassed).toHaveBeenCalledWith('u1', 'TTF2Y', ['1MA360'])
    );
    expect(getManualPassedSnapshot('TTF2Y')).toEqual(new Set(['1MA360']));
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
