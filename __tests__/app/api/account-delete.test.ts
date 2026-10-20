// Integration tests for POST /api/account/delete (self-service erasure).
import { NextRequest } from 'next/server';
import { createAuthMocks, createDocRef } from '@/__tests__/helpers/mocks';

const { mockGetTokens, authEdgeFactory, authConfigFactory } = createAuthMocks();
jest.mock('next-firebase-auth-edge', () => authEdgeFactory);
jest.mock('@/lib/auth-config', () => authConfigFactory);
jest.mock('@/lib/rate-limit-in-memory', () => ({
  checkWindow: jest.fn(() => ({ allowed: true })),
}));

const mockCollectPaths = jest.fn(() => ['registrations/evt1/user1/a.pdf']);
const mockCollectUserStoragePaths = jest.fn().mockResolvedValue([]);
const mockDeleteStorageFiles = jest.fn().mockResolvedValue(1);
jest.mock('@/lib/server-registration-files', () => ({
  collectRegistrationFilePaths: (...args: unknown[]) =>
    mockCollectPaths(...args),
  collectUserStorageFilePaths: (...args: unknown[]) =>
    mockCollectUserStoragePaths(...args),
  deleteStorageFiles: (...args: unknown[]) => mockDeleteStorageFiles(...args),
}));

const mockBatchDelete = jest.fn();
const mockBatchCommit = jest.fn().mockResolvedValue(undefined);
const mockDeleteUser = jest.fn().mockResolvedValue(undefined);
jest.mock('@/lib/firebase-admin', () => ({
  adminAuth: { deleteUser: (...args: unknown[]) => mockDeleteUser(...args) },
  adminDb: {
    collection: jest.fn((name: string) => {
      if (name === 'registrations')
        return {
          where: () => ({
            get: jest.fn().mockResolvedValue({
              empty: false,
              size: 1,
              docs: [
                { data: () => ({ registrationData: {} }), ref: 'reg-ref' },
              ],
            }),
            limit: () => ({
              get: jest.fn().mockResolvedValue({
                empty: false,
                size: 1,
                docs: [{ ref: 'reg-ref' }],
              }),
            }),
          }),
        };
      if (name === 'eventAttendance')
        return {
          get: jest.fn().mockResolvedValue({
            docs: [
              {
                get: (key: string) =>
                  key === 'entries'
                    ? [
                        { userId: 'user1', attended: true },
                        { userId: 'other', attended: false },
                      ]
                    : undefined,
                ref: {
                  update: jest.fn().mockResolvedValue(undefined),
                },
              },
            ],
          }),
        };
      if (name === 'users') return { doc: () => createDocRef('user1') };
      throw new Error(`unexpected collection ${name}`);
    }),
    batch: jest.fn(() => ({
      delete: mockBatchDelete,
      commit: mockBatchCommit,
    })),
  },
}));

async function erase() {
  const { POST } = await import('@/app/api/account/delete/route');
  return POST(
    new NextRequest('http://localhost/api/account/delete', {
      method: 'POST',
    }),
  );
}

describe('POST /api/account/delete', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetTokens.mockResolvedValue({ decodedToken: { uid: 'user1' } });
  });

  it('returns 401 when not authenticated', async () => {
    mockGetTokens.mockResolvedValue(null);
    const res = await erase();
    expect(res.status).toBe(401);
    expect(mockDeleteUser).not.toHaveBeenCalled();
  });

  it('deletes registrations, files, attendance history, profile, and auth', async () => {
    const res = await erase();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ success: true, authDeleted: true });
    expect(mockDeleteStorageFiles).toHaveBeenCalledWith(
      ['registrations/evt1/user1/a.pdf'],
      { failOnError: true },
    );
    expect(mockDeleteUser).toHaveBeenCalledWith('user1');
  });

  it('includes orphaned files found under the user storage prefix', async () => {
    mockCollectUserStoragePaths.mockResolvedValueOnce([
      'registrations/evt1/user1/orphan.pdf',
      'registrations/evt1/user1/a.pdf',
    ]);
    const res = await erase();
    expect(res.status).toBe(200);
    expect(mockDeleteStorageFiles).toHaveBeenCalledWith(
      ['registrations/evt1/user1/a.pdf', 'registrations/evt1/user1/orphan.pdf'],
      { failOnError: true },
    );
  });

  it('keeps the account when file deletion fails', async () => {
    mockDeleteStorageFiles.mockRejectedValueOnce(new Error('storage down'));
    const error = jest.spyOn(console, 'error').mockImplementation(() => {});
    const res = await erase();
    expect(res.status).toBe(500);
    expect(mockBatchDelete).not.toHaveBeenCalled();
    expect(mockDeleteUser).not.toHaveBeenCalled();
    error.mockRestore();
  });

  it('still reports success when the auth account cannot be deleted', async () => {
    mockDeleteUser.mockRejectedValueOnce(new Error('auth unavailable'));
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const res = await erase();
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toEqual({ success: true, authDeleted: false });
    warn.mockRestore();
  });

  it('returns 500 when profile deletion fails', async () => {
    const failure = jest.fn().mockRejectedValue(new Error('db down'));
    const { adminDb } = jest.requireMock('@/lib/firebase-admin');
    adminDb.collection.mockImplementation((name: string) => {
      if (name === 'registrations')
        return {
          where: () => ({
            get: failure,
            limit: () => ({ get: failure }),
          }),
        };
      if (name === 'eventAttendance')
        return { get: jest.fn().mockResolvedValue({ docs: [] }) };
      return { doc: () => createDocRef('user1') };
    });
    const error = jest.spyOn(console, 'error').mockImplementation(() => {});
    const res = await erase();
    expect(res.status).toBe(500);
    error.mockRestore();
  });
});
