// Integration test for DELETE /api/admin/members with mocked erasure and auth.
import { createAuthMocks } from '@/__tests__/helpers/mocks';
import { resetRateLimits } from '@/lib/rate-limit-in-memory';

const { mockGetTokens, authEdgeFactory, authConfigFactory } = createAuthMocks();
jest.mock('next-firebase-auth-edge', () => authEdgeFactory);
jest.mock('@/lib/auth-config', () => authConfigFactory);

// The erasure itself is covered by the /api/account/delete tests.
const mockErase = jest.fn().mockResolvedValue(undefined);
jest.mock('@/lib/account-erasure', () => ({
  eraseAccount: (...args: unknown[]) => mockErase(...args),
}));

// Target accounts' custom claims, by uid.
let claims: Record<string, Record<string, unknown>>;
jest.mock('@/lib/firebase-admin', () => ({
  adminAuth: {
    getUser: async (uid: string) => {
      if (!(uid in claims)) throw { code: 'auth/user-not-found' };
      return { uid, customClaims: claims[uid] };
    },
  },
}));

const mockLog = jest.fn().mockResolvedValue(undefined);
jest.mock('@/lib/server-audit-log', () => ({
  logAdminAction: (...args: unknown[]) => mockLog(...args),
}));

const remove = (uid: string) =>
  new Request(
    `http://localhost/api/admin/members?uid=${encodeURIComponent(uid)}`,
    { method: 'DELETE', headers: { 'x-forwarded-for': '1.2.3.4' } },
  );

const asAdmin = () =>
  mockGetTokens.mockResolvedValue({
    decodedToken: { uid: 'admin1', admin: true },
  });

describe('DELETE /api/admin/members', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetRateLimits();
    claims = {
      member1: {},
      admin2: { admin: true },
      super1: { superAdmin: true },
    };
  });

  it('keeps the hierarchy: only a superAdmin can erase an admin', async () => {
    asAdmin();
    const { DELETE } = await import('@/app/api/admin/members/route');
    for (const uid of ['admin2', 'super1']) {
      const res = await DELETE(remove(uid) as never);
      expect(res.status).toBe(403);
    }
    expect(mockErase).not.toHaveBeenCalled();

    mockGetTokens.mockResolvedValue({
      decodedToken: { uid: 'super2', superAdmin: true },
    });
    expect((await DELETE(remove('admin2') as never)).status).toBe(200);
    expect(mockErase).toHaveBeenCalledWith('admin2');
  });

  it('still erases leftover data for a member whose sign-in is already gone', async () => {
    asAdmin();
    const { DELETE } = await import('@/app/api/admin/members/route');
    expect((await DELETE(remove('ghost1') as never)).status).toBe(200);
    expect(mockErase).toHaveBeenCalledWith('ghost1');
  });

  it('refuses anyone who is not an admin', async () => {
    const { DELETE } = await import('@/app/api/admin/members/route');
    mockGetTokens.mockResolvedValue(null);
    expect((await DELETE(remove('member1') as never)).status).toBe(401);
    mockGetTokens.mockResolvedValue({ decodedToken: { uid: 'member2' } });
    expect((await DELETE(remove('member1') as never)).status).toBe(403);
    expect(mockErase).not.toHaveBeenCalled();
  });

  it('rejects malformed ids and an admin deleting themselves', async () => {
    asAdmin();
    const { DELETE } = await import('@/app/api/admin/members/route');
    for (const bad of ['', '../x', 'a/b']) {
      expect((await DELETE(remove(bad) as never)).status).toBe(400);
    }
    const self = await DELETE(remove('admin1') as never);
    expect(self.status).toBe(400);
    expect((await self.json()).error).toMatch(/My Account/);
    expect(mockErase).not.toHaveBeenCalled();
  });

  it('fully erases the member and logs who did it', async () => {
    asAdmin();
    const { DELETE } = await import('@/app/api/admin/members/route');
    const res = await DELETE(remove('member1') as never);
    expect(res.status).toBe(200);
    expect(mockErase).toHaveBeenCalledWith('member1');
    const entry = {
      action: 'remove',
      adminUid: 'admin1',
      path: 'users/member1',
      ip: '1.2.3.4',
    };
    expect(mockLog).toHaveBeenNthCalledWith(
      1,
      { ...entry, status: 'started' },
      { required: true },
    );
    expect(mockLog).toHaveBeenNthCalledWith(2, {
      ...entry,
      status: 'completed',
    });
  });

  it('refuses to erase when the start cannot be logged', async () => {
    asAdmin();
    mockLog.mockRejectedValueOnce(new Error('firestore down'));
    const error = jest.spyOn(console, 'error').mockImplementation(() => {});
    const { DELETE } = await import('@/app/api/admin/members/route');
    expect((await DELETE(remove('member1') as never)).status).toBe(500);
    expect(mockErase).not.toHaveBeenCalled();
    error.mockRestore();
  });

  it('reports a failed erasure without logging it as completed', async () => {
    asAdmin();
    mockErase.mockRejectedValueOnce(new Error('storage down'));
    const error = jest.spyOn(console, 'error').mockImplementation(() => {});
    const { DELETE } = await import('@/app/api/admin/members/route');
    expect((await DELETE(remove('member1') as never)).status).toBe(500);
    expect(mockLog).toHaveBeenCalledTimes(1);
    expect(mockLog.mock.calls[0][0]).toMatchObject({ status: 'started' });
    error.mockRestore();
  });
});
