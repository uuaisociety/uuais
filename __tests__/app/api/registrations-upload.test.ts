// Integration test for POST /api/registrations/upload with mocked Firebase dependencies.
import { createAuthMocks, createDocRef } from '@/__tests__/helpers/mocks';
import { resetRateLimits } from '@/lib/rate-limit-in-memory';

const { mockGetTokens, authEdgeFactory, authConfigFactory } = createAuthMocks();
jest.mock('next-firebase-auth-edge', () => authEdgeFactory);
jest.mock('@/lib/auth-config', () => authConfigFactory);

const mockStorageSave = jest.fn().mockResolvedValue(undefined);
const mockStorageFile = jest.fn(() => ({ save: mockStorageSave }));
jest.mock('firebase-admin', () => ({
  storage: () => ({ bucket: () => ({ file: mockStorageFile }) }),
}));

const userDocRef = createDocRef('user1');
const eventDocRef = createDocRef('evt1');
const usersCollection = { doc: jest.fn(() => userDocRef) };
const eventsCollection = { doc: jest.fn(() => eventDocRef) };

jest.mock('@/lib/firebase-admin', () => ({
  adminDb: {
    collection: jest.fn((name: string) => {
      if (name === 'users') return usersCollection;
      if (name === 'events') return eventsCollection;
      return { doc: jest.fn(() => createDocRef()) };
    }),
  },
}));

function pdfFile(name = 'cv.pdf', content = '%PDF-1.4 test cv content') {
  return new File([content], name, { type: 'application/pdf' });
}

function uploadRequest(options: { eventId?: string; file?: File | null } = {}) {
  const { eventId = 'evt1', file = pdfFile() } = options;
  const formData = new FormData();
  if (eventId !== '') formData.set('eventId', eventId);
  if (file) formData.set('file', file);
  return new Request('http://localhost/api/registrations/upload', {
    method: 'POST',
    body: formData,
  });
}

describe('POST /api/registrations/upload', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetRateLimits();
    userDocRef.get.mockResolvedValue({
      exists: true,
      data: () => ({ isMember: true }),
    });
    eventDocRef.get.mockResolvedValue({
      exists: true,
      data: () => ({ title: 'Event' }),
    });
  });

  it('returns 401 when not authenticated', async () => {
    mockGetTokens.mockResolvedValue(null);
    const { POST } = await import('@/app/api/registrations/upload/route');
    const res = await POST(uploadRequest() as never);
    expect(res.status).toBe(401);
  });

  it('returns 403 when the caller is not a member', async () => {
    mockGetTokens.mockResolvedValue({ decodedToken: { uid: 'user1' } });
    userDocRef.get.mockResolvedValue({
      exists: true,
      data: () => ({ isMember: false }),
    });
    const { POST } = await import('@/app/api/registrations/upload/route');
    const res = await POST(uploadRequest() as never);
    expect(res.status).toBe(403);
    expect(mockStorageFile).not.toHaveBeenCalled();
  });

  it('rejects invalid event ids before touching the database', async () => {
    mockGetTokens.mockResolvedValue({ decodedToken: { uid: 'user1' } });
    const { POST } = await import('@/app/api/registrations/upload/route');
    for (const badId of ['', '../etc', 'a b', 'a'.repeat(129)]) {
      const res = await POST(uploadRequest({ eventId: badId }) as never);
      expect(res.status).toBe(400);
    }
    expect(userDocRef.get).not.toHaveBeenCalled();
  });

  it('returns 400 when no file is provided', async () => {
    mockGetTokens.mockResolvedValue({ decodedToken: { uid: 'user1' } });
    const { POST } = await import('@/app/api/registrations/upload/route');
    const res = await POST(uploadRequest({ file: null }) as never);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/no file/i);
  });

  it('returns 404 when the event does not exist', async () => {
    mockGetTokens.mockResolvedValue({ decodedToken: { uid: 'user1' } });
    eventDocRef.get.mockResolvedValue({ exists: false, data: () => null });
    const { POST } = await import('@/app/api/registrations/upload/route');
    const res = await POST(uploadRequest() as never);
    expect(res.status).toBe(404);
  });

  it('rejects non-PDF uploads', async () => {
    mockGetTokens.mockResolvedValue({ decodedToken: { uid: 'user1' } });
    const { POST } = await import('@/app/api/registrations/upload/route');
    const file = new File(['hello'], 'cv.txt', { type: 'text/plain' });
    const res = await POST(uploadRequest({ file }) as never);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/must be a PDF/i);
    expect(mockStorageFile).not.toHaveBeenCalled();
  });

  it('rejects files without a PDF header', async () => {
    mockGetTokens.mockResolvedValue({ decodedToken: { uid: 'user1' } });
    const { POST } = await import('@/app/api/registrations/upload/route');
    const file = new File(['not a pdf'], 'cv.pdf', { type: 'application/pdf' });
    const res = await POST(uploadRequest({ file }) as never);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/valid PDF/i);
  });

  it('rejects files over 3MB', async () => {
    mockGetTokens.mockResolvedValue({ decodedToken: { uid: 'user1' } });
    const { POST } = await import('@/app/api/registrations/upload/route');
    const file = new File([new Uint8Array(3 * 1024 * 1024 + 1)], 'big.pdf', {
      type: 'application/pdf',
    });
    const res = await POST(uploadRequest({ file }) as never);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/<= 3MB/i);
  });

  it('stores the PDF under the event/uid prefix and returns the file reference', async () => {
    mockGetTokens.mockResolvedValue({ decodedToken: { uid: 'user1' } });
    const { POST } = await import('@/app/api/registrations/upload/route');
    const res = await POST(uploadRequest() as never);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(mockStorageFile).toHaveBeenCalledWith(
      expect.stringMatching(/^registrations\/evt1\/user1\/\d+_cv\.pdf$/),
    );
    expect(mockStorageSave).toHaveBeenCalledWith(expect.any(Buffer), {
      metadata: { contentType: 'application/pdf' },
    });
    expect(body.path).toMatch(/^registrations\/evt1\/user1\/\d+_cv\.pdf$/);
    expect(body.name).toBe('cv.pdf');
    expect(body.size).toBeGreaterThan(0);
  });

  it('sanitizes path traversal attempts in the filename', async () => {
    mockGetTokens.mockResolvedValue({ decodedToken: { uid: 'user1' } });
    const { POST } = await import('@/app/api/registrations/upload/route');
    const res = await POST(
      uploadRequest({ file: pdfFile('../../evil.pdf') }) as never,
    );
    expect(res.status).toBe(200);
    expect(mockStorageFile).toHaveBeenCalledWith(
      expect.stringMatching(
        /^registrations\/evt1\/user1\/\d+_\.\._\.\._evil\.pdf$/,
      ),
    );
  });

  it('rate limits repeated uploads from the same member', async () => {
    mockGetTokens.mockResolvedValue({ decodedToken: { uid: 'user1' } });
    const { POST } = await import('@/app/api/registrations/upload/route');
    for (let i = 0; i < 10; i++) {
      const res = await POST(uploadRequest() as never);
      expect(res.status).toBe(200);
    }
    const res = await POST(uploadRequest() as never);
    expect(res.status).toBe(429);
  });
});
