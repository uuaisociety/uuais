// Integration test for GET /api/cvs with mocked Firebase dependencies.
import { createAuthMocks } from '@/__tests__/helpers/mocks';
import { resetRateLimits } from '@/lib/rate-limit-in-memory';

const { mockGetTokens, authEdgeFactory, authConfigFactory } = createAuthMocks();
jest.mock('next-firebase-auth-edge', () => authEdgeFactory);
jest.mock('@/lib/auth-config', () => authConfigFactory);

const mockExists = jest.fn();
const mockDownload = jest.fn();
const mockFile = jest.fn(() => ({
  exists: mockExists,
  download: mockDownload,
}));
jest.mock('firebase-admin', () => ({
  storage: () => ({ bucket: () => ({ file: mockFile }) }),
}));

const mockLog = jest.fn().mockResolvedValue(undefined);
jest.mock('@/lib/server-audit-log', () => ({
  logAdminAction: (...args: unknown[]) => mockLog(...args),
}));

let cvRecord: Record<string, unknown> | null;
let profile: Record<string, unknown> | null;
let allowlist: Set<string>;
const snap = (data: Record<string, unknown> | null) => ({
  exists: data !== null,
  get: (key: string) => data?.[key],
});
jest.mock('@/lib/firebase-admin', () => ({
  adminDb: {
    collection: (name: string) => ({
      doc: (id: string) => ({
        get: async () =>
          name === 'partnerAccounts'
            ? snap(allowlist.has(id) ? { email: id } : null)
            : snap(name === 'cvs' ? cvRecord : profile),
      }),
    }),
  },
}));

const as = (claims: Record<string, unknown>) =>
  mockGetTokens.mockResolvedValue({
    decodedToken: { uid: 'viewer1', ...claims },
  });

// A partner is any verified sign-in email on the allowlist, whatever its case.
const partner = { email: 'HR@Partner.example', email_verified: true };

const download = (uid = 'member1') =>
  new Request(`http://localhost/api/cvs?uid=${encodeURIComponent(uid)}`, {
    headers: { 'x-forwarded-for': '1.2.3.4' },
  });

describe('GET /api/cvs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetRateLimits();
    cvRecord = { path: 'cvs/member1/cv.pdf' };
    profile = { name: 'Anna Svensson' };
    allowlist = new Set(['hr@partner.example']);
    mockExists.mockResolvedValue([true]);
    mockDownload.mockResolvedValue([Buffer.from('%PDF-1.4 cv')]);
  });

  it('returns 401 when not signed in', async () => {
    mockGetTokens.mockResolvedValue(null);
    const { GET } = await import('@/app/api/cvs/route');
    expect((await GET(download() as never)).status).toBe(401);
  });

  it('returns 403 for members who are neither admin nor partner', async () => {
    as({ email: 'someone@student.uu.se', email_verified: true });
    const { GET } = await import('@/app/api/cvs/route');
    expect((await GET(download() as never)).status).toBe(403);
    expect(mockFile).not.toHaveBeenCalled();
  });

  it('rejects malformed member ids', async () => {
    as(partner);
    const { GET } = await import('@/app/api/cvs/route');
    for (const bad of ['', '../x', 'a/b', 'a'.repeat(129)]) {
      expect((await GET(download(bad) as never)).status).toBe(400);
    }
  });

  it('serves nothing once consent is withdrawn, even if a file lingers', async () => {
    as(partner);
    cvRecord = null;
    const { GET } = await import('@/app/api/cvs/route');
    expect((await GET(download() as never)).status).toBe(404);
    expect(mockFile).not.toHaveBeenCalled();
  });

  it('lets a partner download the CV as Firstname_Lastname.pdf and logs it', async () => {
    as(partner);
    const { GET } = await import('@/app/api/cvs/route');
    const res = await GET(download() as never);

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('application/pdf');
    expect(res.headers.get('Content-Disposition')).toContain(
      'filename="Anna_Svensson.pdf"',
    );
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    expect(mockFile).toHaveBeenCalledWith('cvs/member1/cv.pdf');
    expect(mockLog).toHaveBeenCalledWith({
      action: 'download',
      adminUid: 'viewer1',
      path: 'cvs/member1/cv.pdf',
      ip: '1.2.3.4',
      role: 'partner',
      email: 'HR@Partner.example',
    });
  });

  it('refuses an allowlisted email that the provider has not verified', async () => {
    as({ ...partner, email_verified: false });
    const { GET } = await import('@/app/api/cvs/route');
    expect((await GET(download() as never)).status).toBe(403);
  });

  it('refuses a partner removed from the allowlist on their next request', async () => {
    as(partner);
    const { GET } = await import('@/app/api/cvs/route');
    expect((await GET(download() as never)).status).toBe(200);
    allowlist.clear();
    expect((await GET(download() as never)).status).toBe(403);
  });

  it('lets an admin download without a partner role tag', async () => {
    as({ admin: true });
    const { GET } = await import('@/app/api/cvs/route');
    const res = await GET(download() as never);
    expect(res.status).toBe(200);
    expect(mockLog).toHaveBeenCalledWith(
      expect.not.objectContaining({ role: expect.anything() }),
    );
  });
});
