// PATCH /api/admin/members/profile: logged admin edits that can't touch the
// member's email or consent, can't undo an unsubscribe, keep the admin
// hierarchy, and never recreate an erased profile.
import { createAuthMocks } from '@/__tests__/helpers/mocks';
import { resetRateLimits } from '@/lib/rate-limit-in-memory';

const { mockGetTokens, authEdgeFactory, authConfigFactory } = createAuthMocks();
jest.mock('next-firebase-auth-edge', () => authEdgeFactory);
jest.mock('@/lib/auth-config', () => authConfigFactory);

let claims: Record<string, Record<string, unknown>>;
let profiles: Record<string, Record<string, unknown>>;
const mockUpdate = jest.fn().mockResolvedValue(undefined);
jest.mock('@/lib/firebase-admin', () => ({
  adminAuth: {
    getUser: async (uid: string) => {
      if (!(uid in claims)) throw { code: 'auth/user-not-found' };
      return { uid, customClaims: claims[uid] };
    },
  },
  adminDb: {
    collection: () => ({
      doc: (uid: string) => ({
        get: async () => ({
          exists: uid in profiles,
          data: () => profiles[uid],
        }),
        update: (data: unknown) => mockUpdate(uid, data),
      }),
    }),
  },
}));

const mockLog = jest.fn().mockResolvedValue(undefined);
jest.mock('@/lib/server-audit-log', () => ({
  logAdminAction: (...args: unknown[]) => mockLog(...args),
}));

const patch = (uid: string, update: unknown) =>
  new Request('http://localhost/api/admin/members/profile', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uid, update }),
  }) as never;

const asAdmin = () =>
  mockGetTokens.mockResolvedValue({
    decodedToken: { uid: 'admin1', admin: true },
  });

describe('PATCH /api/admin/members/profile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetRateLimits();
    claims = { member1: {}, admin2: { admin: true } };
    profiles = {
      member1: { name: 'Ada', isMember: true, unsubscribedFromEmails: true },
      admin2: { name: 'Bo' },
    };
    asAdmin();
  });

  it('refuses non-admins', async () => {
    const { PATCH } = await import('@/app/api/admin/members/profile/route');
    mockGetTokens.mockResolvedValue({ decodedToken: { uid: 'u1' } });
    expect((await PATCH(patch('member1', { name: 'X' }))).status).toBe(403);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('writes only changed fields and logs their names, not values', async () => {
    const { PATCH } = await import('@/app/api/admin/members/profile/route');
    const res = await PATCH(
      patch('member1', { name: 'Ada', program: 'CS', isMember: false }),
    );
    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith(
      'member1',
      expect.objectContaining({ program: 'CS', isMember: false }),
    );
    expect(mockUpdate.mock.calls[0][1]).not.toHaveProperty('name');
    expect(mockLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'update',
        adminUid: 'admin1',
        path: 'users/member1',
        fields: ['program', 'isMember'],
      }),
      { required: true },
    );
    expect(JSON.stringify(mockLog.mock.calls[0][0])).not.toContain('CS');
  });

  it("rejects the member's email and consent fields, and unknown fields", async () => {
    const { PATCH } = await import('@/app/api/admin/members/profile/route');
    for (const update of [
      { email: 'x@y.z' },
      { newsletter: true },
      { partnerContactOptIn: false },
      { privacyAcceptedAt: '2026-01-01' },
      { eventHistory: [] },
      { admin: true },
    ])
      expect((await PATCH(patch('member1', update))).status).toBe(400);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('rejects oversized or mistyped values', async () => {
    const { PATCH } = await import('@/app/api/admin/members/profile/route');
    for (const update of [
      { name: 'x'.repeat(101) },
      { isMember: 'yes' },
      { expectedGraduationYear: 3000 },
    ])
      expect((await PATCH(patch('member1', update))).status).toBe(400);
  });

  it("never undoes a member's unsubscribe", async () => {
    const { PATCH } = await import('@/app/api/admin/members/profile/route');
    expect(
      (await PATCH(patch('member1', { unsubscribedFromEmails: false }))).status,
    ).toBe(403);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('may suppress email to a member', async () => {
    profiles.member1.unsubscribedFromEmails = false;
    const { PATCH } = await import('@/app/api/admin/members/profile/route');
    expect(
      (await PATCH(patch('member1', { unsubscribedFromEmails: true }))).status,
    ).toBe(200);
    expect(mockUpdate).toHaveBeenCalled();
  });

  it('keeps the hierarchy: only a superAdmin edits an admin', async () => {
    const { PATCH } = await import('@/app/api/admin/members/profile/route');
    expect((await PATCH(patch('admin2', { name: 'B' }))).status).toBe(403);
    mockGetTokens.mockResolvedValue({
      decodedToken: { uid: 'super1', superAdmin: true },
    });
    expect((await PATCH(patch('admin2', { name: 'B' }))).status).toBe(200);
  });

  it('never creates a profile that does not exist', async () => {
    claims.ghost = {};
    const { PATCH } = await import('@/app/api/admin/members/profile/route');
    expect((await PATCH(patch('ghost', { name: 'G' }))).status).toBe(404);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('does not write when the log fails', async () => {
    mockLog.mockRejectedValueOnce(new Error('down'));
    const { PATCH } = await import('@/app/api/admin/members/profile/route');
    expect((await PATCH(patch('member1', { program: 'CS' }))).status).toBe(500);
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});
