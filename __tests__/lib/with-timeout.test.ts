import { TimeoutError, withTimeout } from '@/lib/with-timeout';

describe('withTimeout', () => {
  afterEach(() => jest.useRealTimers());

  it('resolves with the value when the work finishes in time', async () => {
    await expect(withTimeout(Promise.resolve(42), 1000)).resolves.toBe(42);
  });

  it('passes the original error through', async () => {
    const error = new Error('denied');
    await expect(withTimeout(Promise.reject(error), 1000)).rejects.toBe(error);
  });

  it('rejects with a TimeoutError when the work hangs', async () => {
    jest.useFakeTimers();
    const pending = withTimeout(new Promise<never>(() => {}), 5000);
    jest.advanceTimersByTime(5000);
    await expect(pending).rejects.toBeInstanceOf(TimeoutError);
  });
});
