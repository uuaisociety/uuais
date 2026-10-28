/**
 * @jest-environment node
 */
const mockGetTokens = jest.fn();
jest.mock('next-firebase-auth-edge', () => ({
  getTokens: (...a: unknown[]) => mockGetTokens(...a),
}));
jest.mock('@/lib/auth-config', () => ({ authConfig: {} }));
jest.mock('next/headers', () => ({ cookies: async () => ({}) }));

import { requireAdmin, requireAuth, getServerSession } from '@/lib/server-auth';

const token = (claims: Record<string, unknown>) =>
  mockGetTokens.mockResolvedValue({ decodedToken: { uid: 'u1', ...claims } });
const req = { cookies: {} } as never;
const nowS = () => Math.floor(Date.now() / 1000);

describe('server-auth session expiry', () => {
  it('accepts a current token', async () => {
    token({ admin: true, exp: nowS() + 600 });
    expect(await requireAdmin(req)).toMatchObject({ ok: true });
    expect(await getServerSession()).toMatchObject({
      uid: 'u1',
      isAdmin: true,
    });
  });

  it('treats an expired token (refresh failed: revoked, deleted, demoted) as signed out', async () => {
    token({ admin: true, exp: nowS() - 400 * 24 * 3600 });
    expect(await requireAuth(req)).toEqual({
      ok: false,
      reason: 'invalid-token',
    });
    expect(await requireAdmin(req)).toEqual({
      ok: false,
      reason: 'invalid-token',
    });
    expect(await getServerSession()).toBeNull();
  });
});
