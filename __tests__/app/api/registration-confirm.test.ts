import { NextRequest } from 'next/server';

const mockReadExisting = jest.fn();
const mockQueryGet = jest.fn();
const mockTransactionGet = jest.fn();
const mockTransactionUpdate = jest.fn();
const mockRunTransaction = jest.fn(
  async (
    callback: (transaction: {
      get: typeof mockTransactionGet;
      update: typeof mockTransactionUpdate;
    }) => unknown,
  ) => callback({ get: mockTransactionGet, update: mockTransactionUpdate }),
);
const mockIncrement = jest.fn((amount: number) => ({ increment: amount }));
const registrationRef = {
  kind: 'registration',
  get: (...args: unknown[]) => mockReadExisting(...args),
};
const eventRef = { kind: 'event' };
const mockRegistrationSnapshot = (
  status: string,
  token = 'a'.repeat(40),
  eventId = 'event-1',
) => ({
  exists: true,
  get: (field: string) =>
    ({ status, confirmationToken: token, eventId })[field],
});
const mockEventSnapshot = (exists: boolean, current = 0, max = 5) => ({
  exists,
  get: (field: string) =>
    ({ currentRegistrations: current, maxCapacity: max })[field],
});

jest.mock('@/lib/firebase-admin', () => ({
  adminDb: {
    collection: (name: string) =>
      name === 'registrations'
        ? {
            doc: () => registrationRef,
            where: () => ({
              limit: () => ({
                get: (...args: unknown[]) => mockQueryGet(...args),
              }),
            }),
          }
        : { doc: () => eventRef },
    runTransaction: (...args: unknown[]) => mockRunTransaction(...args),
  },
}));
jest.mock('firebase-admin/firestore', () => ({
  FieldValue: { increment: (amount: number) => mockIncrement(amount) },
}));
jest.mock('@/lib/rate-limit-in-memory', () => ({
  checkWindow: jest.fn(() => ({ allowed: true })),
}));

const token = 'a'.repeat(40);
const request = (body: unknown, headers?: Record<string, string>) =>
  new NextRequest('http://localhost/api/registrations/confirm', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });

async function post(body: unknown, headers?: Record<string, string>) {
  const { POST } = await import('@/app/api/registrations/confirm/route');
  return POST(request(body, headers));
}

async function postRaw(body: string) {
  const { POST } = await import('@/app/api/registrations/confirm/route');
  return POST(
    new NextRequest('http://localhost/api/registrations/confirm', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body,
    }),
  );
}

describe('POST /api/registrations/confirm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockQueryGet.mockResolvedValue({
      empty: false,
      docs: [{ ref: registrationRef }],
    });
    mockReadExisting.mockResolvedValue({
      exists: true,
      get: (field: string) =>
        ({ status: 'invited', confirmationToken: token })[field],
    });
    mockTransactionGet.mockImplementation(
      async (ref: typeof registrationRef | typeof eventRef) =>
        ref === registrationRef
          ? mockRegistrationSnapshot('invited')
          : mockEventSnapshot(true),
    );
  });

  it('rejects malformed and oversized requests before database access', async () => {
    const malformed = await post({ token: 'short' });
    expect(malformed.status).toBe(400);
    const oversized = await post({ token }, { 'content-length': '5000' });
    expect(oversized.status).toBe(413);
    expect(mockRunTransaction).not.toHaveBeenCalled();
  });

  it('rejects malformed and oversized JSON without a declared content-length', async () => {
    const malformed = await postRaw('{');
    expect(malformed.status).toBe(400);
    expect(await malformed.json()).toEqual({
      ok: false,
      message: 'Invalid token',
    });

    const oversized = await postRaw(
      `${JSON.stringify({ token })}${' '.repeat(5000)}`,
    );
    expect(oversized.status).toBe(413);
    expect(await oversized.json()).toEqual({
      ok: false,
      message: 'Invalid token',
    });
    expect(mockRunTransaction).not.toHaveBeenCalled();
  });

  it('rejects wrong tokens and a regId that does not identify the invited registration', async () => {
    mockReadExisting.mockResolvedValueOnce({
      exists: true,
      get: (field: string) =>
        ({ status: 'invited', confirmationToken: 'b'.repeat(40) })[field],
    });
    expect((await (await post({ token, regId: 'reg-1' })).json()).message).toBe(
      'Invalid token',
    );
    expect(mockRunTransaction).not.toHaveBeenCalled();
  });

  it('rejects used tokens and rechecks token state transactionally', async () => {
    mockQueryGet.mockResolvedValueOnce({ empty: true });
    expect((await (await post({ token })).json()).message).toMatch(
      /already used/,
    );
    mockTransactionGet.mockResolvedValueOnce(
      mockRegistrationSnapshot('confirmed'),
    );
    expect((await (await post({ token })).json()).message).toMatch(
      /no longer valid/,
    );
    expect(mockTransactionUpdate).not.toHaveBeenCalled();
  });

  it('returns a generic server error when Firestore fails', async () => {
    mockQueryGet.mockRejectedValueOnce(new Error('private database details'));
    const response = await post({ token });
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      ok: false,
      message: 'Unable to confirm registration',
    });
  });

  it('rejects full or missing events without changing either document', async () => {
    mockTransactionGet
      .mockResolvedValueOnce(mockRegistrationSnapshot('invited'))
      .mockResolvedValueOnce(mockEventSnapshot(true, 2, 2));
    expect((await (await post({ token })).json()).message).toMatch(
      /event is full/i,
    );
    mockTransactionGet
      .mockResolvedValueOnce(mockRegistrationSnapshot('invited'))
      .mockResolvedValueOnce(mockEventSnapshot(false));
    expect((await (await post({ token })).json()).message).toBe(
      'Event missing',
    );
    expect(mockTransactionUpdate).not.toHaveBeenCalled();
  });

  it('confirms once and updates registration and capacity in the same transaction', async () => {
    const response = await post({ token });
    expect(await response.json()).toEqual({
      ok: true,
      message: 'Registration confirmed',
    });
    expect(mockTransactionUpdate).toHaveBeenCalledTimes(2);
    expect(mockTransactionUpdate).toHaveBeenNthCalledWith(
      1,
      registrationRef,
      expect.objectContaining({ status: 'confirmed', confirmationToken: null }),
    );
    expect(mockTransactionUpdate).toHaveBeenNthCalledWith(2, eventRef, {
      currentRegistrations: { increment: 1 },
    });
  });
});
