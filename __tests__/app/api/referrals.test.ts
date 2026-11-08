// GET /api/referrals: referral counts for the leaderboard, behind a token that
// only this route accepts.
const mockGet = jest.fn();
const mockWhere = jest.fn();
const mockSelect = jest.fn();

jest.mock('@/lib/firebase-admin', () => ({
  adminDb: {
    collection: (name: string) => {
      if (name !== 'users') throw new Error(`unexpected collection ${name}`);
      return {
        where: (...args: unknown[]) => {
          mockWhere(...args);
          return {
            select: (...fields: unknown[]) => {
              mockSelect(...fields);
              return { get: () => mockGet() };
            },
          };
        },
      };
    },
  },
}));

import { resetRateLimits } from '@/lib/rate-limit-in-memory';

const docs = (rows: Record<string, unknown>[]) => ({
  docs: rows.map((r) => ({ data: () => r })),
});

const get = (headers: Record<string, string> = {}) =>
  new Request('http://localhost/api/referrals', { headers }) as never;

describe('GET /api/referrals', () => {
  const original = {
    referrals: process.env.REFERRALS_API_TOKEN,
    mcp: process.env.MCP_ADMIN_TOKEN,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // A fresh route module per test: its five-minute count cache lives in module scope.
    jest.resetModules();
    resetRateLimits();
    process.env.REFERRALS_API_TOKEN = 'referrals-token';
    process.env.MCP_ADMIN_TOKEN = 'mcp-token';
  });

  afterAll(() => {
    for (const [key, value] of [
      ['REFERRALS_API_TOKEN', original.referrals],
      ['MCP_ADMIN_TOKEN', original.mcp],
    ] as const) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it.each([
    ['no token', {}],
    ['a wrong token', { Authorization: 'Bearer wrong' }],
    ['the MCP token', { Authorization: 'Bearer mcp-token' }],
    ['the token without Bearer', { Authorization: 'referrals-token' }],
  ])('returns 401 with %s and reads nothing', async (_, headers) => {
    const { GET } = await import('@/app/api/referrals/route');
    expect((await GET(get(headers))).status).toBe(401);
    expect(mockGet).not.toHaveBeenCalled();
  });

  it('returns 401 when REFERRALS_API_TOKEN is not configured', async () => {
    delete process.env.REFERRALS_API_TOKEN;
    const { GET } = await import('@/app/api/referrals/route');
    const res = await GET(get({ Authorization: 'Bearer referrals-token' }));
    expect(res.status).toBe(401);
    expect(mockGet).not.toHaveBeenCalled();
  });

  it('returns ranked referrer counts and nothing about who was referred', async () => {
    mockGet.mockResolvedValue(
      docs([
        { heardOfUs: 'referral', referredBy: 'Ada Lovelace' },
        { heardOfUs: 'referral', referredBy: ' ada  lovelace' },
        { heardOfUs: 'referral', referredBy: 'Bo' },
        { heardOfUs: 'referral' },
      ]),
    );
    const { GET } = await import('@/app/api/referrals/route');
    const res = await GET(get({ Authorization: 'Bearer referrals-token' }));

    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    expect(await res.json()).toEqual({
      referrers: [
        { name: 'Ada Lovelace', count: 2 },
        { name: 'Bo', count: 1 },
      ],
    });
    expect(mockWhere).toHaveBeenCalledWith('heardOfUs', '==', 'referral');
    expect(mockSelect).toHaveBeenCalledWith('heardOfUs', 'referredBy');
  });

  it('returns 500 without details when Firestore fails', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockGet.mockRejectedValue(new Error('boom'));
    const { GET } = await import('@/app/api/referrals/route');
    const res = await GET(get({ Authorization: 'Bearer referrals-token' }));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'Internal server error' });
    spy.mockRestore();
  });

  it('returns 429 after 10 failed auth attempts from one IP', async () => {
    const { GET } = await import('@/app/api/referrals/route');
    const headers = {
      Authorization: 'Bearer wrong',
      'x-forwarded-for': '10.0.0.7',
    };
    const statuses: number[] = [];
    for (let i = 0; i < 11; i++)
      statuses.push((await GET(get(headers))).status);
    expect(statuses.slice(0, 10).every((s) => s === 401)).toBe(true);
    expect(statuses[10]).toBe(429);
  });

  const authorized = (ip = '10.0.0.8') =>
    get({ Authorization: 'Bearer referrals-token', 'x-forwarded-for': ip });

  it('reads Firestore once per five minutes however often it is polled', async () => {
    mockGet.mockResolvedValue(
      docs([{ heardOfUs: 'referral', referredBy: 'Bo' }]),
    );
    const { GET } = await import('@/app/api/referrals/route');
    const now = Date.now();
    const clock = jest.spyOn(Date, 'now').mockReturnValue(now);
    try {
      for (let i = 0; i < 3; i++)
        expect((await GET(authorized())).status).toBe(200);
      expect(mockGet).toHaveBeenCalledTimes(1);
      clock.mockReturnValue(now + 5 * 60_000);
      const res = await GET(authorized());
      expect(await res.json()).toEqual({
        referrers: [{ name: 'Bo', count: 1 }],
      });
      expect(mockGet).toHaveBeenCalledTimes(2);
    } finally {
      clock.mockRestore();
    }
  });

  it('does not cache a failed count', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockGet
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce(docs([]));
    const { GET } = await import('@/app/api/referrals/route');
    expect((await GET(authorized())).status).toBe(500);
    expect((await GET(authorized())).status).toBe(200);
    expect(mockGet).toHaveBeenCalledTimes(2);
    spy.mockRestore();
  });

  it('caps polling across all token holders and says when to retry', async () => {
    mockGet.mockResolvedValue(docs([]));
    const { GET } = await import('@/app/api/referrals/route');
    // Different addresses share the cap: behind Cloudflare one poller's IP varies.
    for (let i = 0; i < 20; i++)
      expect((await GET(authorized(`10.0.0.${i}`))).status).toBe(200);
    const res = await GET(authorized('10.0.1.1'));
    expect(res.status).toBe(429);
    expect(Number(res.headers.get('Retry-After'))).toBeGreaterThan(0);
    expect(mockGet).toHaveBeenCalledTimes(1);
  });
});
