import { checkWindow, resetRateLimits } from '@/lib/rate-limit-in-memory';

describe('in-memory rate limits', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(0);
    resetRateLimits();
  });

  afterEach(() => jest.useRealTimers());

  it('enforces each client limit and resets expired windows', () => {
    expect(checkWindow('client', 1, 1000).allowed).toBe(true);
    expect(checkWindow('client', 1, 1000).allowed).toBe(false);
    jest.advanceTimersByTime(1000);
    expect(checkWindow('client', 1, 1000).allowed).toBe(true);
  });

  it('rejects a flood of new client keys without evicting active limits', () => {
    checkWindow('existing-client', 1, 1000);
    for (let index = 0; index < 10_000; index++)
      checkWindow(`flood-${index}`, 1, 1000);
    expect(checkWindow('another-client', 1, 1000).allowed).toBe(false);
    expect(checkWindow('existing-client', 1, 1000).allowed).toBe(false);
    jest.advanceTimersByTime(60_000);
    expect(checkWindow('another-client', 1, 1000).allowed).toBe(true);
  });
});

describe('rate-limit buckets', () => {
  it('fills one bucket without failing closed for another', async () => {
    const { checkWindow, resetRateLimits } =
      await import('@/lib/rate-limit-in-memory');
    resetRateLimits();
    for (let i = 0; i < 10_000; i++)
      checkWindow(`ip-${i}`, 10, 60_000, 'flood');
    expect(checkWindow('ip-new', 10, 60_000, 'flood').allowed).toBe(false);
    expect(checkWindow('cv-download:partner', 10, 60_000).allowed).toBe(true);
    resetRateLimits();
  });

  it('keeps each key prefix in its own bucket by default', async () => {
    const { checkWindow, resetRateLimits } =
      await import('@/lib/rate-limit-in-memory');
    resetRateLimits();
    for (let i = 0; i < 10_000; i++)
      checkWindow(`registration-confirm:ip-${i}`, 10, 60_000);
    expect(checkWindow('registration-confirm:ip-new', 10, 60_000).allowed).toBe(
      false,
    );
    expect(checkWindow('account-delete:user1', 10, 60_000).allowed).toBe(true);
    resetRateLimits();
  });
});
