// Integration tests for POST/DELETE /api/registrations (server-authoritative mutations).
import { NextRequest } from 'next/server';
import { createAuthMocks, createDocRef } from '@/__tests__/helpers/mocks';

const { mockGetTokens, authEdgeFactory, authConfigFactory } = createAuthMocks();
jest.mock('next-firebase-auth-edge', () => authEdgeFactory);
jest.mock('@/lib/auth-config', () => authConfigFactory);
jest.mock('@/lib/rate-limit-in-memory', () => ({
  checkWindow: jest.fn(() => ({ allowed: true })),
}));

const mockDeleteRegistrationFilePaths = jest.fn().mockResolvedValue(undefined);
jest.mock('@/lib/server-registration-files', () => ({
  deleteRegistrationFilePaths: (...args: unknown[]) =>
    mockDeleteRegistrationFilePaths(...args),
}));

const mockTxGet = jest.fn();
const mockTxSet = jest.fn();
const mockTxUpdate = jest.fn();
const mockTxDelete = jest.fn();
const mockRunTransaction = jest.fn(async (callback: (tx: unknown) => unknown) =>
  callback({
    get: mockTxGet,
    set: mockTxSet,
    update: mockTxUpdate,
    delete: mockTxDelete,
  }),
);

const userDocRef = createDocRef('user1');
const eventDocRef = createDocRef('evt1');
const regDocRef = createDocRef('evt1_user1');
const existingQuery = { __query: true };
const registrationsCollection = {
  doc: jest.fn(() => regDocRef),
  where: jest.fn(() => ({ where: jest.fn(() => existingQuery) })),
};

jest.mock('@/lib/firebase-admin', () => ({
  adminDb: {
    collection: jest.fn((name: string) => {
      if (name === 'users') return { doc: () => userDocRef };
      if (name === 'events') return { doc: () => eventDocRef };
      if (name === 'registrations') return registrationsCollection;
      throw new Error(`unexpected collection ${name}`);
    }),
    runTransaction: (...args: unknown[]) => mockRunTransaction(...args),
  },
}));

jest.mock('firebase-admin/firestore', () => ({
  FieldValue: {
    increment: (n: number) => ({ __increment: n }),
    serverTimestamp: () => ({ __serverTimestamp: true }),
  },
}));

const eventSnapshot = (options: {
  published?: boolean;
  capacity?: number | null;
  current?: number;
  closesAt?: string | null;
}) => ({
  exists: true,
  get: (key: string) =>
    ({
      published: options.published ?? true,
      maxCapacity: options.capacity ?? null,
      currentRegistrations: options.current ?? 0,
      registrationClosesAt: options.closesAt ?? null,
    })[key],
});

const ownRegSnapshot = (options: {
  status?: string;
  counted?: boolean | undefined;
  userId?: string;
}) => ({
  exists: true,
  get: (key: string) =>
    ({
      status: options.status ?? 'registered',
      counted: options.counted,
      userId: options.userId ?? 'user1',
      eventId: 'evt1',
    })[key],
});

function postRequest(body: unknown) {
  return new NextRequest('http://localhost/api/registrations', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const validBody = {
  eventId: 'evt1',
  registrationData: { 'Your name': 'Alice' },
  userEmail: 'alice@example.com',
  userName: 'Alice',
};

async function post(body: unknown) {
  const { POST } = await import('@/app/api/registrations/route');
  return POST(postRequest(body));
}

async function del(params: string) {
  const { DELETE } = await import('@/app/api/registrations/route');
  return DELETE(
    new NextRequest(`http://localhost/api/registrations?${params}`, {
      method: 'DELETE',
    }),
  );
}

describe('/api/registrations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetTokens.mockResolvedValue({ decodedToken: { uid: 'user1' } });
    userDocRef.get.mockResolvedValue({
      exists: true,
      data: () => ({ isMember: true }),
    });
    mockTxGet.mockImplementation(async (target: unknown) =>
      target === existingQuery
        ? { docs: [] }
        : eventSnapshot({ capacity: 10, current: 3 }),
    );
  });

  describe('POST', () => {
    it('returns 401 when not authenticated', async () => {
      mockGetTokens.mockResolvedValue(null);
      const res = await post(validBody);
      expect(res.status).toBe(401);
    });

    it('returns 403 when the caller is not a member', async () => {
      userDocRef.get.mockResolvedValue({
        exists: true,
        data: () => ({ isMember: false }),
      });
      const res = await post(validBody);
      expect(res.status).toBe(403);
      expect(mockTxSet).not.toHaveBeenCalled();
    });

    it('creates a counted registration and increments the event counter', async () => {
      const res = await post(validBody);
      const body = await res.json();
      expect(res.status).toBe(200);
      expect(body).toEqual({ regId: 'evt1_user1', status: 'registered' });
      expect(mockTxSet).toHaveBeenCalledWith(
        regDocRef,
        expect.objectContaining({
          eventId: 'evt1',
          userId: 'user1',
          status: 'registered',
          counted: true,
        }),
      );
      expect(mockTxUpdate).toHaveBeenCalledWith(eventDocRef, {
        currentRegistrations: { __increment: 1 },
      });
    });

    it('rejects invalid answer shapes', async () => {
      const res = await post({
        ...validBody,
        registrationData: { answer: { unexpected: true } },
      });
      expect(res.status).toBe(400);
      expect(mockTxSet).not.toHaveBeenCalled();
    });

    it('blocks duplicate active registrations', async () => {
      mockTxGet.mockImplementation(async (target: unknown) =>
        target === existingQuery
          ? {
              docs: [
                { ref: 'stale', get: () => 'registered', data: () => ({}) },
              ],
            }
          : eventSnapshot({ capacity: 10, current: 3 }),
      );
      const res = await post(validBody);
      expect(res.status).toBe(409);
      expect(mockTxSet).not.toHaveBeenCalled();
    });

    it('replaces stale cancelled docs and cleans up their files', async () => {
      const staleData = { eventId: 'evt1', userId: 'user1' };
      mockTxGet.mockImplementation(async (target: unknown) =>
        target === existingQuery
          ? {
              docs: [
                {
                  ref: 'stale-ref',
                  get: () => 'cancelled',
                  data: () => staleData,
                },
              ],
            }
          : eventSnapshot({ capacity: 10, current: 0 }),
      );
      const res = await post(validBody);
      expect(res.status).toBe(200);
      expect(mockTxDelete).toHaveBeenCalledWith('stale-ref');
      expect(mockDeleteRegistrationFilePaths).toHaveBeenCalledWith(staleData);
    });

    it('uses the waitlist when the event is full and does not increment', async () => {
      mockTxGet.mockImplementation(async (target: unknown) =>
        target === existingQuery
          ? { docs: [] }
          : eventSnapshot({ capacity: 3, current: 3 }),
      );
      const res = await post(validBody);
      const body = await res.json();
      expect(body.status).toBe('waitlist');
      expect(mockTxSet).toHaveBeenCalledWith(
        regDocRef,
        expect.objectContaining({ status: 'waitlist', counted: false }),
      );
      expect(mockTxUpdate).not.toHaveBeenCalled();
    });

    it('returns 403 for unpublished events', async () => {
      mockTxGet.mockImplementation(async (target: unknown) =>
        target === existingQuery
          ? { docs: [] }
          : eventSnapshot({ published: false }),
      );
      const res = await post(validBody);
      expect(res.status).toBe(403);
    });
  });

  describe('DELETE', () => {
    const ownData = {
      userId: 'user1',
      eventId: 'evt1',
      status: 'registered',
      counted: true,
      registrationData: {},
    };

    beforeEach(() => {
      regDocRef.get.mockResolvedValue({
        exists: true,
        data: () => ownData,
      });
      mockTxGet.mockResolvedValue(ownRegSnapshot({ counted: true }));
    });

    it('returns 400 for an invalid registration id', async () => {
      const res = await del('regId=..%2Fevil&mode=cancel');
      expect(res.status).toBe(400);
    });

    it('returns 404 when the registration does not exist', async () => {
      regDocRef.get.mockResolvedValue({ exists: false, data: () => null });
      const res = await del('regId=evt1_user1&mode=cancel');
      expect(res.status).toBe(404);
    });

    it('returns 403 when the caller does not own the registration', async () => {
      regDocRef.get.mockResolvedValue({
        exists: true,
        data: () => ({ ...ownData, userId: 'someone-else' }),
      });
      const res = await del('regId=evt1_user1&mode=cancel');
      expect(res.status).toBe(403);
    });

    it('cancels the registration, decrements the counter, and deletes files', async () => {
      const res = await del('regId=evt1_user1&mode=cancel');
      const body = await res.json();
      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(mockTxUpdate).toHaveBeenCalledWith(regDocRef, {
        status: 'cancelled',
        counted: false,
      });
      expect(mockDeleteRegistrationFilePaths).toHaveBeenCalledWith(ownData);
    });

    it('decrements the event counter for counted registrations', async () => {
      const delEventRef = eventDocRef;
      mockTxGet.mockImplementation(async (target: unknown) =>
        target === regDocRef
          ? ownRegSnapshot({ counted: true })
          : {
              exists: true,
              get: (key: string) =>
                key === 'currentRegistrations' ? 4 : undefined,
            },
      );
      await del('regId=evt1_user1&mode=cancel');
      expect(mockTxUpdate).toHaveBeenCalledWith(delEventRef, {
        currentRegistrations: 3,
      });
    });

    it('does nothing for an already cancelled registration', async () => {
      mockTxGet.mockResolvedValue(
        ownRegSnapshot({ status: 'cancelled', counted: false }),
      );
      const res = await del('regId=evt1_user1&mode=cancel');
      expect(res.status).toBe(200);
      expect(mockTxUpdate).not.toHaveBeenCalled();
    });
  });
});
