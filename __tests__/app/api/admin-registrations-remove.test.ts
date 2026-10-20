// Integration tests for DELETE /api/admin/registrations (admin-only removal).
import { NextRequest } from 'next/server';
import { createAuthMocks, createDocRef } from '@/__tests__/helpers/mocks';

const { mockGetTokens, authEdgeFactory, authConfigFactory } = createAuthMocks();
jest.mock('next-firebase-auth-edge', () => authEdgeFactory);
jest.mock('@/lib/auth-config', () => authConfigFactory);
jest.mock('@/lib/rate-limit-in-memory', () => ({
  checkWindow: jest.fn(() => ({ allowed: true })),
}));

const mockDeleteRegistrationFilePaths = jest.fn().mockResolvedValue(2);
jest.mock('@/lib/server-registration-files', () => ({
  deleteRegistrationFilePaths: (...args: unknown[]) =>
    mockDeleteRegistrationFilePaths(...args),
}));

const mockLogAdminAction = jest.fn().mockResolvedValue(undefined);
jest.mock('@/lib/server-audit-log', () => ({
  logAdminAction: (...args: unknown[]) => mockLogAdminAction(...args),
}));

const mockTxGet = jest.fn();
const mockTxDelete = jest.fn();
const mockTxUpdate = jest.fn();
const mockRunTransaction = jest.fn(async (callback: (tx: unknown) => unknown) =>
  callback({
    get: mockTxGet,
    delete: mockTxDelete,
    update: mockTxUpdate,
    set: jest.fn(),
  }),
);

const regDocRef = createDocRef('evt1_user1');
const eventDocRef = createDocRef('evt1');

jest.mock('@/lib/firebase-admin', () => ({
  adminDb: {
    collection: jest.fn((name: string) => {
      if (name === 'registrations') return { doc: () => regDocRef };
      if (name === 'events') return { doc: () => eventDocRef };
      throw new Error(`unexpected collection ${name}`);
    }),
    runTransaction: (...args: unknown[]) => mockRunTransaction(...args),
  },
}));

const ownData = {
  userId: 'user1',
  eventId: 'evt1',
  status: 'registered',
  counted: true,
  registrationData: {},
};

async function remove(params = 'regId=evt1_user1') {
  const { DELETE } = await import('@/app/api/admin/registrations/route');
  return DELETE(
    new NextRequest(`http://localhost/api/admin/registrations?${params}`, {
      method: 'DELETE',
      headers: { 'x-forwarded-for': '203.0.113.7, 10.0.0.1' },
    }),
  );
}

describe('DELETE /api/admin/registrations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetTokens.mockResolvedValue({
      decodedToken: { uid: 'admin1', admin: true },
    });
    regDocRef.get.mockResolvedValue({ exists: true, data: () => ownData });
    mockTxGet.mockResolvedValue({
      exists: true,
      get: (key: string) =>
        ({
          status: 'registered',
          counted: true,
          currentRegistrations: 4,
        })[key],
    });
  });

  it('returns 401 when not authenticated', async () => {
    mockGetTokens.mockResolvedValue(null);
    const res = await remove();
    expect(res.status).toBe(401);
    expect(mockTxDelete).not.toHaveBeenCalled();
  });

  it('returns 403 for non-admin callers', async () => {
    mockGetTokens.mockResolvedValue({ decodedToken: { uid: 'user1' } });
    const res = await remove();
    expect(res.status).toBe(403);
    expect(mockTxDelete).not.toHaveBeenCalled();
  });

  it('returns 400 for an invalid registration id', async () => {
    const res = await remove('regId=bad%20id');
    expect(res.status).toBe(400);
  });

  it('returns 404 when the registration does not exist', async () => {
    regDocRef.get.mockResolvedValue({ exists: false, data: () => null });
    const res = await remove();
    expect(res.status).toBe(404);
  });

  it('deletes the doc, decrements the counter, removes files, and audits', async () => {
    const res = await remove();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ success: true, deleted: 2 });
    expect(mockTxDelete).toHaveBeenCalledWith(regDocRef);
    expect(mockTxUpdate).toHaveBeenCalledWith(eventDocRef, {
      currentRegistrations: 3,
    });
    expect(mockDeleteRegistrationFilePaths).toHaveBeenCalledWith(ownData);

    const deleteOrder = mockTxDelete.mock.invocationCallOrder[0];
    const fileOrder =
      mockDeleteRegistrationFilePaths.mock.invocationCallOrder[0];
    expect(deleteOrder).toBeLessThan(fileOrder);

    expect(mockLogAdminAction).toHaveBeenCalledWith({
      action: 'remove',
      adminUid: 'admin1',
      eventId: 'evt1',
      regId: 'evt1_user1',
      count: 2,
      ip: '203.0.113.7',
    });
  });

  it('does not decrement for waitlisted registrations', async () => {
    mockTxGet.mockResolvedValue({
      exists: true,
      get: (key: string) => ({ status: 'waitlist', counted: false })[key],
    });
    const res = await remove();
    expect(res.status).toBe(200);
    expect(mockTxUpdate).not.toHaveBeenCalled();
  });
});
