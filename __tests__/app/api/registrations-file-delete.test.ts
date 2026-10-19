// Integration test for DELETE /api/registrations/file with mocked Firebase dependencies.
import { createAuthMocks, createDocRef } from '@/__tests__/helpers/mocks';
import { resetRateLimits } from '@/lib/rate-limit-in-memory';

const { mockGetTokens, authEdgeFactory, authConfigFactory } = createAuthMocks();
jest.mock('next-firebase-auth-edge', () => authEdgeFactory);
jest.mock('@/lib/auth-config', () => authConfigFactory);

const mockStorageDelete = jest.fn().mockResolvedValue(undefined);
const mockStorageFile = jest.fn(() => ({ delete: mockStorageDelete }));
jest.mock('firebase-admin', () => ({
  storage: () => ({ bucket: () => ({ file: mockStorageFile }) }),
  app: () => ({ options: { storageBucket: 'uuais.appspot.com' } }),
}));

const regDocRef = createDocRef('reg1');
jest.mock('@/lib/firebase-admin', () => ({
  adminDb: { collection: jest.fn(() => ({ doc: jest.fn(() => regDocRef) })) },
}));

const OWNED_PATH = 'registrations/evt1/user1/123_cv.pdf';

async function call(regId = 'reg1') {
  const { DELETE } = await import('@/app/api/registrations/file/route');
  const req = new Request(
    `http://localhost/api/registrations/file?regId=${encodeURIComponent(regId)}`,
    { method: 'DELETE' },
  );
  return DELETE(req as never);
}

describe('DELETE /api/registrations/file', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStorageDelete.mockResolvedValue(undefined);
    resetRateLimits();
    mockGetTokens.mockResolvedValue({ decodedToken: { uid: 'user1' } });
    regDocRef.get.mockResolvedValue({
      exists: true,
      data: () => ({
        userId: 'user1',
        eventId: 'evt1',
        registrationData: {
          'Upload CV': { path: OWNED_PATH, name: 'cv.pdf', size: 10 },
          Name: 'Alice',
        },
      }),
    });
  });

  it('returns 401 when not authenticated', async () => {
    mockGetTokens.mockResolvedValue(null);
    const res = await call();
    expect(res.status).toBe(401);
  });

  it('rejects invalid registration ids', async () => {
    for (const bad of ['', '../x', 'a b', 'a'.repeat(129)]) {
      const res = await call(bad);
      expect(res.status).toBe(400);
    }
    expect(regDocRef.get).not.toHaveBeenCalled();
  });

  it('returns 404 for unknown registrations', async () => {
    regDocRef.get.mockResolvedValue({ exists: false, data: () => null });
    const res = await call();
    expect(res.status).toBe(404);
  });

  it('returns 403 when the registration belongs to someone else', async () => {
    regDocRef.get.mockResolvedValue({
      exists: true,
      data: () => ({ userId: 'user2', eventId: 'evt1', registrationData: {} }),
    });
    const res = await call();
    expect(res.status).toBe(403);
    expect(mockStorageFile).not.toHaveBeenCalled();
  });

  it('deletes the file referenced by the registration', async () => {
    const res = await call();
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toEqual({ success: true, deleted: 1 });
    expect(mockStorageFile).toHaveBeenCalledWith(OWNED_PATH);
    expect(mockStorageDelete).toHaveBeenCalledTimes(1);
  });

  it('ignores references outside registrations/{eventId}/{uid}/', async () => {
    regDocRef.get.mockResolvedValue({
      exists: true,
      data: () => ({
        userId: 'user1',
        eventId: 'evt1',
        registrationData: {
          a: { path: 'team-applications/123_cv.pdf' },
          b: { path: 'registrations/evt1/user2/123_cv.pdf' },
          c: { path: 'registrations/evt1/user1/../../etc/passwd' },
          d: { path: 'registrations/other-event/user1/123_cv.pdf' },
        },
      }),
    });
    const res = await call();
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toEqual({ success: true, deleted: 0 });
    expect(mockStorageFile).not.toHaveBeenCalled();
  });

  it('keeps going when a storage delete fails', async () => {
    mockStorageDelete.mockRejectedValueOnce(new Error('storage down'));
    const res = await call();
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toEqual({ success: true, deleted: 0 });
  });

  it('rate limits repeated deletions', async () => {
    for (let i = 0; i < 20; i++) {
      const res = await call();
      expect(res.status).toBe(200);
    }
    const res = await call();
    expect(res.status).toBe(429);
  });
});
