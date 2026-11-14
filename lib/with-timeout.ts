/** Thrown by `withTimeout` when the work didn't settle in time. */
export class TimeoutError extends Error {
  constructor(message = 'The request took too long.') {
    super(message);
    this.name = 'TimeoutError';
  }
}

/**
 * Reject with a TimeoutError if `promise` hasn't settled within `ms`. Firestore
 * reads and writes can hang indefinitely on a bad connection; this turns that
 * into an error the UI can show and retry. The underlying work is not cancelled.
 */
export const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new TimeoutError()), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
