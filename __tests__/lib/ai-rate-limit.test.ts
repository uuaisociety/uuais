import { reserveRequest, recordTokens } from '@/lib/ai/rate-limit';

const mockTxGet = jest.fn();
const mockTxSet = jest.fn();
const mockSet = jest.fn();
const mockConfigGet = jest.fn();
const mockDoc = jest.fn((id: string) => ({
  id,
  get: mockConfigGet,
  set: mockSet,
}));

jest.mock('@/lib/firebase-admin', () => ({
  adminDb: {
    collection: jest.fn(() => ({ doc: mockDoc })),
    runTransaction: jest.fn((fn: (tx: unknown) => unknown) =>
      fn({ get: mockTxGet, set: mockTxSet }),
    ),
  },
}));

jest.mock('firebase-admin/firestore', () => ({
  FieldValue: {
    increment: jest.fn((n: number) => ({ __inc: n })),
    serverTimestamp: jest.fn(() => 'ts'),
  },
}));

const usageDoc = (requestCount?: number) =>
  requestCount === undefined
    ? { exists: false, get: () => undefined }
    : { exists: true, get: () => requestCount };

describe('reserveRequest', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockConfigGet.mockResolvedValue({
      exists: true,
      data: () => ({ rateLimitRequestsPerDay: 3 }),
    });
  });

  it('claims the first request of the day', async () => {
    mockTxGet.mockResolvedValue(usageDoc());
    const status = await reserveRequest('u1');
    expect(status).toMatchObject({
      allowed: true,
      remaining: 2,
      totalRequests: 1,
    });
    expect(mockTxSet).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ userId: 'u1', requestCount: 1 }),
      { merge: true },
    );
  });

  it('claims the last remaining request', async () => {
    mockTxGet.mockResolvedValue(usageDoc(2));
    const status = await reserveRequest('u1');
    expect(status).toMatchObject({
      allowed: true,
      remaining: 0,
      totalRequests: 3,
    });
  });

  it('refuses without writing once the limit is used up', async () => {
    mockTxGet.mockResolvedValue(usageDoc(3));
    const status = await reserveRequest('u1');
    expect(status).toMatchObject({ allowed: false, remaining: 0 });
    expect(mockTxSet).not.toHaveBeenCalled();
  });

  it('returns the day it reserved on, for recordTokens', async () => {
    mockTxGet.mockResolvedValue(usageDoc());
    const { date } = await reserveRequest('u1');
    expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(mockDoc).toHaveBeenCalledWith(`u1_${date}`);
  });
});

describe('recordTokens', () => {
  it('increments tokens on the reserved day', async () => {
    await recordTokens('u1', '2026-10-31', 42);
    expect(mockDoc).toHaveBeenCalledWith('u1_2026-10-31');
    expect(mockSet).toHaveBeenCalledWith(
      { tokenUsage: { __inc: 42 } },
      { merge: true },
    );
  });
});
