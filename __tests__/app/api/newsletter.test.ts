const mockAuthorizeMember = jest.fn();
jest.mock('@/lib/member-auth', () => ({
  authorizeMember: (...args: unknown[]) => mockAuthorizeMember(...args),
}));

const mockUpdate = jest.fn();
const mockRunTransaction = jest.fn();
const mockCollection = jest.fn();
const mockDoc = jest.fn();
jest.mock('@/lib/firebase-admin', () => ({
  adminDb: {
    collection: (...args: unknown[]) => {
      mockCollection(...args);
      return {
        doc: (...docArgs: unknown[]) => {
          mockDoc(...docArgs);
          return { ref: 'user-ref' };
        },
      };
    },
    runTransaction: (...args: unknown[]) => mockRunTransaction(...args),
  },
}));

jest.mock('firebase-admin', () => ({
  apps: ['initialized'],
  firestore: Object.assign(jest.fn(), {
    FieldValue: { serverTimestamp: jest.fn(() => 'server-time') },
  }),
}));

import { POST } from '@/app/api/newsletter/route';

function makeReq(
  body: string,
  headers: Record<string, string> = { 'content-type': 'application/json' },
) {
  return new Request('http://localhost/api/newsletter', {
    method: 'POST',
    body,
    headers,
  });
}

describe('POST /api/newsletter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthorizeMember.mockResolvedValue({ ok: true, uid: 'verified-uid' });
    mockRunTransaction.mockImplementation(
      async (callback: (tx: unknown) => unknown) =>
        callback({
          get: jest
            .fn()
            .mockResolvedValue({
              exists: true,
              data: () => ({
                isMember: true,
                privacyAcceptedAt: '2026-01-01',
                unrelated: 'keep',
              }),
            }),
          update: mockUpdate,
        }),
    );
  });

  it('returns 401 for anonymous requests', async () => {
    mockAuthorizeMember.mockResolvedValue({ ok: false, reason: 'no-auth' });
    expect((await POST(makeReq('{"newsletter":true}') as never)).status).toBe(
      401,
    );
    expect(mockRunTransaction).not.toHaveBeenCalled();
  });

  it.each(['{', 'null', '{}', '{"newsletter":"true"}'])(
    'returns 400 for invalid JSON payload %s',
    async (body) => {
      expect((await POST(makeReq(body) as never)).status).toBe(400);
      expect(mockRunTransaction).not.toHaveBeenCalled();
    },
  );

  it('requires application/json and rejects a different origin', async () => {
    expect(
      (
        await POST(
          makeReq('{"newsletter":true}', {
            'content-type': 'text/plain',
          }) as never,
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await POST(
          makeReq('{"newsletter":true}', {
            'content-type': 'application/json',
            origin: 'https://other.example',
          }) as never,
        )
      ).status,
    ).toBe(403);
  });

  it.each([
    { exists: false, data: () => null },
    { exists: true, data: () => ({ isMember: true, privacyAcceptedAt: '' }) },
    {
      exists: true,
      data: () => ({ isMember: false, privacyAcceptedAt: 'accepted' }),
    },
  ])('returns 403 for missing or incomplete membership', async (profile) => {
    mockRunTransaction.mockImplementation(
      async (callback: (tx: unknown) => unknown) =>
        callback({
          get: jest.fn().mockResolvedValue(profile),
          update: mockUpdate,
        }),
    );
    expect((await POST(makeReq('{"newsletter":true}') as never)).status).toBe(
      403,
    );
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('updates only newsletter and updatedAt for the authenticated uid', async () => {
    const response = await POST(makeReq('{"newsletter":false}') as never);
    expect(response.status).toBe(200);
    expect(mockCollection).toHaveBeenCalledWith('users');
    expect(mockDoc).toHaveBeenCalledWith('verified-uid');
    expect(mockUpdate).toHaveBeenCalledWith(
      { ref: 'user-ref' },
      { newsletter: false, updatedAt: expect.any(String) },
    );
    expect(mockUpdate.mock.calls[0][1]).not.toHaveProperty(
      'unsubscribedFromEmails',
    );
  });

  it('returns 500 when the transaction fails', async () => {
    mockRunTransaction.mockRejectedValue(new Error('database unavailable'));
    expect((await POST(makeReq('{"newsletter":true}') as never)).status).toBe(
      500,
    );
  });
});
