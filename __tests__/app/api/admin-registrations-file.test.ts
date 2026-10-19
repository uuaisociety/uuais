import { createAuthMocks } from '@/__tests__/helpers/mocks';
import { resetRateLimits } from '@/lib/rate-limit-in-memory';

const { mockGetTokens, authEdgeFactory, authConfigFactory } = createAuthMocks();
jest.mock('next-firebase-auth-edge', () => authEdgeFactory);
jest.mock('@/lib/auth-config', () => authConfigFactory);

const mockFileExists = jest.fn().mockResolvedValue([true]);
const mockGetMetadata = jest
  .fn()
  .mockResolvedValue([{ contentType: 'application/pdf' }]);
const mockDownload = jest
  .fn()
  .mockResolvedValue([Buffer.from('%PDF-1.4 test')]);
const mockStorageFile = jest.fn(() => ({
  exists: mockFileExists,
  getMetadata: mockGetMetadata,
  download: mockDownload,
}));

jest.mock('@/lib/firebase-admin', () => ({}));

jest.mock('firebase-admin', () => ({
  storage: () => ({
    bucket: () => ({ file: mockStorageFile }),
  }),
  app: () => ({ options: { storageBucket: 'uuais.appspot.com' } }),
}));

describe('GET /api/admin/registrations/file', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetRateLimits();
  });

  it('returns 401 when not authenticated', async () => {
    mockGetTokens.mockResolvedValue(null);
    const { GET } = await import('@/app/api/admin/registrations/file/route');
    const req = new Request(
      'http://localhost/api/admin/registrations/file?path=registrations/evt1/user1/123_cv.pdf',
    );
    const res = await GET(req as unknown as Request);
    expect(res.status).toBe(401);
  });

  it('returns 403 when not admin', async () => {
    mockGetTokens.mockResolvedValue({
      decodedToken: { uid: 'user', admin: false },
    });
    const { GET } = await import('@/app/api/admin/registrations/file/route');
    const req = new Request(
      'http://localhost/api/admin/registrations/file?path=registrations/evt1/user1/123_cv.pdf',
    );
    const res = await GET(req as unknown as Request);
    expect(res.status).toBe(403);
  });

  it('rejects paths outside the registrations prefix', async () => {
    mockGetTokens.mockResolvedValue({
      decodedToken: { uid: 'admin', admin: true },
    });
    const { GET } = await import('@/app/api/admin/registrations/file/route');
    for (const bad of [
      '../secrets.json',
      'registrations/../x.pdf',
      'team-applications/123_cv.pdf',
      'other/x.pdf',
      '',
      'registrations/',
    ]) {
      const req = new Request(
        `http://localhost/api/admin/registrations/file?path=${encodeURIComponent(bad)}`,
      );
      const res = await GET(req as unknown as Request);
      expect(res.status).toBe(400);
    }
    expect(mockStorageFile).not.toHaveBeenCalled();
  });

  it('streams the file for a valid admin request', async () => {
    mockGetTokens.mockResolvedValue({
      decodedToken: { uid: 'admin', admin: true },
    });
    const { GET } = await import('@/app/api/admin/registrations/file/route');
    const req = new Request(
      'http://localhost/api/admin/registrations/file?path=registrations/evt1/user1/123_cv.pdf',
    );
    const res = await GET(req as unknown as Request);

    expect(res.status).toBe(200);
    expect(mockStorageFile).toHaveBeenCalledWith(
      'registrations/evt1/user1/123_cv.pdf',
    );
    expect(mockFileExists).toHaveBeenCalled();
    expect(mockGetMetadata).toHaveBeenCalled();
    expect(mockDownload).toHaveBeenCalled();
    expect(res.headers.get('Content-Type')).toBe('application/pdf');
    expect(res.headers.get('Content-Disposition')).toContain('123_cv.pdf');
    expect(await res.arrayBuffer()).toEqual(
      Buffer.from('%PDF-1.4 test').buffer as ArrayBuffer,
    );
  });

  it('returns 404 when the file does not exist', async () => {
    mockGetTokens.mockResolvedValue({
      decodedToken: { uid: 'admin', admin: true },
    });
    mockFileExists.mockResolvedValue([false]);
    const { GET } = await import('@/app/api/admin/registrations/file/route');
    const req = new Request(
      'http://localhost/api/admin/registrations/file?path=registrations/evt1/user1/123_cv.pdf',
    );
    const res = await GET(req as unknown as Request);
    expect(res.status).toBe(404);
  });

  it('returns 429 when the per-admin rate limit is exceeded', async () => {
    mockGetTokens.mockResolvedValue({
      decodedToken: { uid: 'admin', admin: true },
    });
    const { GET } = await import('@/app/api/admin/registrations/file/route');
    const req = new Request(
      'http://localhost/api/admin/registrations/file?path=registrations/evt1/user1/123_cv.pdf',
    );

    for (let i = 0; i < 120; i++) {
      await GET(req as unknown as Request);
    }
    const res = await GET(req as unknown as Request);
    expect(res.status).toBe(429);
    expect(await res.json()).toMatchObject({ error: 'rate limit exceeded' });
  });
});
