// Integration tests for POST /api/admin/audit-log (export audit trail).
import { NextRequest } from 'next/server';
import { createAuthMocks } from '@/__tests__/helpers/mocks';

const { mockGetTokens, authEdgeFactory, authConfigFactory } = createAuthMocks();
jest.mock('next-firebase-auth-edge', () => authEdgeFactory);
jest.mock('@/lib/auth-config', () => authConfigFactory);

const mockLogAdminAction = jest.fn().mockResolvedValue(undefined);
jest.mock('@/lib/server-audit-log', () => ({
  logAdminAction: (...args: unknown[]) => mockLogAdminAction(...args),
}));

function auditRequest(body: string) {
  return new NextRequest('http://localhost/api/admin/audit-log', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-forwarded-for': '198.51.100.9, 10.0.0.2',
    },
    body,
  });
}

async function log(body: unknown) {
  const { POST } = await import('@/app/api/admin/audit-log/route');
  return POST(auditRequest(JSON.stringify(body)));
}

describe('POST /api/admin/audit-log', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    (await import('@/lib/rate-limit-in-memory')).resetRateLimits();
    mockGetTokens.mockResolvedValue({
      decodedToken: { uid: 'admin1', admin: true },
    });
  });

  it('returns 401 when not authenticated', async () => {
    mockGetTokens.mockResolvedValue(null);
    const res = await log({ eventId: 'evt1', count: 2 });
    expect(res.status).toBe(401);
    expect(mockLogAdminAction).not.toHaveBeenCalled();
  });

  it('returns 403 for non-admin callers', async () => {
    mockGetTokens.mockResolvedValue({ decodedToken: { uid: 'user1' } });
    const res = await log({ eventId: 'evt1', count: 2 });
    expect(res.status).toBe(403);
  });

  it('records an export audit entry with sanitized fields', async () => {
    const res = await log({ eventId: 'evt1', count: 12, ignored: 'x' });
    expect(res.status).toBe(200);
    expect(mockLogAdminAction).toHaveBeenCalledWith({
      action: 'export',
      adminUid: 'admin1',
      eventId: 'evt1',
      count: 12,
      ip: '198.51.100.9',
    });
  });

  it('drops invalid event ids and counts', async () => {
    const res = await log({ eventId: 'bad id!', count: 'many' });
    expect(res.status).toBe(200);
    expect(mockLogAdminAction).toHaveBeenCalledWith({
      action: 'export',
      adminUid: 'admin1',
      eventId: undefined,
      count: undefined,
      ip: '198.51.100.9',
    });
  });

  it.each([-1, 1.5, 1e300])(
    'only records a count that is a non-negative integer (%p)',
    async (count) => {
      await log({ eventId: 'evt1', count });
      expect(mockLogAdminAction).toHaveBeenCalledWith(
        expect.objectContaining({ count: undefined }),
      );
    },
  );

  it('returns 400 for invalid JSON', async () => {
    const { POST } = await import('@/app/api/admin/audit-log/route');
    const res = await POST(auditRequest('{not json'));
    expect(res.status).toBe(400);
  });

  it('returns 413 for oversized bodies', async () => {
    const { POST } = await import('@/app/api/admin/audit-log/route');
    const res = await POST(auditRequest('x'.repeat(5000)));
    expect(res.status).toBe(413);
  });

  it('rate-limits each admin so the trail cannot be flooded', async () => {
    const { resetRateLimits } = await import('@/lib/rate-limit-in-memory');
    resetRateLimits();
    for (let i = 0; i < 60; i++) expect((await log({})).status).toBe(200);
    expect((await log({})).status).toBe(429);
    resetRateLimits();
  });
});
