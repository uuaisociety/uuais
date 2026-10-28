// Integration test for POST /api/partners/check-email with mocked Firebase dependencies.
import { resetRateLimits } from '@/lib/rate-limit-in-memory';

let allowlist: Set<string>;
let accounts: Record<string, Record<string, unknown>>;

jest.mock('@/lib/firebase-admin', () => ({
  adminDb: {
    collection: () => ({
      doc: (id: string) => ({
        get: async () => ({ exists: allowlist.has(id) }),
      }),
    }),
  },
  adminAuth: {
    getUserByEmail: async (email: string) => {
      if (!(email in accounts)) throw { code: 'auth/user-not-found' };
      return { customClaims: accounts[email] };
    },
  },
}));

const check = (email: unknown, ip = '1.1.1.1') =>
  new Request('http://localhost/api/partners/check-email', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
    body: JSON.stringify({ email }),
  });

const approved = async (res: Response) =>
  ((await res.json()) as { approved?: boolean }).approved;

describe('POST /api/partners/check-email', () => {
  beforeEach(() => {
    resetRateLimits();
    allowlist = new Set(['hr@partner.example']);
    accounts = {
      'board@uuais.com': { admin: true },
      'member@student.uu.se': {},
    };
  });

  it('approves an allowlisted partner, whatever the case or spacing', async () => {
    const { POST } = await import('@/app/api/partners/check-email/route');
    const res = await POST(check('  HR@Partner.example ') as never);
    expect(res.status).toBe(200);
    expect(await approved(res)).toBe(true);
  });

  it('approves an admin', async () => {
    const { POST } = await import('@/app/api/partners/check-email/route');
    expect(await approved(await POST(check('board@uuais.com') as never))).toBe(
      true,
    );
  });

  it('does not approve ordinary members or unknown addresses', async () => {
    const { POST } = await import('@/app/api/partners/check-email/route');
    for (const email of ['member@student.uu.se', 'nobody@example.com']) {
      expect(await approved(await POST(check(email) as never))).toBe(false);
    }
  });

  it('rejects malformed input', async () => {
    const { POST } = await import('@/app/api/partners/check-email/route');
    for (const email of ['', 'not-an-email', 42, null]) {
      expect((await POST(check(email) as never)).status).toBe(400);
    }
  });

  it('rate-limits repeated checks from one address', async () => {
    const { POST } = await import('@/app/api/partners/check-email/route');
    for (let i = 0; i < 10; i++) {
      expect((await POST(check('nobody@example.com') as never)).status).toBe(
        200,
      );
    }
    expect((await POST(check('nobody@example.com') as never)).status).toBe(429);
    expect(
      (await POST(check('nobody@example.com', '2.2.2.2') as never)).status,
    ).toBe(200);
  });
});
