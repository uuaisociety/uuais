// POST /api/admin/members/export: the member CSV exports are logged, and the
// log is required (the client downloads only after it succeeds).
import { createAuthMocks } from '@/__tests__/helpers/mocks';
import { resetRateLimits } from '@/lib/rate-limit-in-memory';

const { mockGetTokens, authEdgeFactory, authConfigFactory } = createAuthMocks();
jest.mock('next-firebase-auth-edge', () => authEdgeFactory);
jest.mock('@/lib/auth-config', () => authConfigFactory);

const mockLog = jest.fn().mockResolvedValue(undefined);
jest.mock('@/lib/server-audit-log', () => ({
  logAdminAction: (...args: unknown[]) => mockLog(...args),
}));

const post = (body: unknown) =>
  new Request('http://localhost/api/admin/members/export', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as never;

describe('POST /api/admin/members/export', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetRateLimits();
    mockGetTokens.mockResolvedValue({
      decodedToken: { uid: 'admin1', admin: true },
    });
  });

  it('refuses non-admins', async () => {
    const { POST } = await import('@/app/api/admin/members/export/route');
    mockGetTokens.mockResolvedValue({ decodedToken: { uid: 'u1' } });
    expect((await POST(post({ kind: 'members', count: 1 }))).status).toBe(403);
    expect(mockLog).not.toHaveBeenCalled();
  });

  it('logs the export as required', async () => {
    const { POST } = await import('@/app/api/admin/members/export/route');
    expect((await POST(post({ kind: 'newsletter', count: 12 }))).status).toBe(
      200,
    );
    expect(mockLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'export',
        adminUid: 'admin1',
        path: 'users#newsletter',
        count: 12,
      }),
      { required: true },
    );
  });

  it('rejects unknown kinds and bad counts', async () => {
    const { POST } = await import('@/app/api/admin/members/export/route');
    for (const body of [
      { kind: 'cvs', count: 1 },
      { kind: 'members', count: -1 },
      { kind: 'members', count: 1.5 },
      { kind: 'members', count: '3' },
    ])
      expect((await POST(post(body))).status).toBe(400);
    expect(mockLog).not.toHaveBeenCalled();
  });

  it('fails when the log cannot be written', async () => {
    mockLog.mockRejectedValueOnce(new Error('firestore down'));
    const { POST } = await import('@/app/api/admin/members/export/route');
    expect((await POST(post({ kind: 'members', count: 1 }))).status).toBe(500);
  });
});
