// Integration test for POST/DELETE /api/account/cv with mocked Firebase dependencies.
import { createAuthMocks, createDocRef } from '@/__tests__/helpers/mocks';
import { resetRateLimits } from '@/lib/rate-limit-in-memory';
import { CV_CONSENT_VERSION } from '@/lib/cv-consent';

const { mockGetTokens, authEdgeFactory, authConfigFactory } = createAuthMocks();
jest.mock('next-firebase-auth-edge', () => authEdgeFactory);
jest.mock('@/lib/auth-config', () => authConfigFactory);

const mockStorageSave = jest.fn().mockResolvedValue(undefined);
const mockStorageFile = jest.fn(() => ({ save: mockStorageSave }));
jest.mock('firebase-admin', () => ({
  storage: () => ({ bucket: () => ({ file: mockStorageFile }) }),
}));

const mockDeleteStorageFiles = jest.fn().mockResolvedValue(1);
jest.mock('@/lib/server-registration-files', () => ({
  deleteStorageFiles: (...args: unknown[]) => mockDeleteStorageFiles(...args),
}));

const userDocRef = createDocRef('user1');
const cvDocRef = createDocRef('user1');
const usersCollection = { doc: jest.fn(() => userDocRef) };
const cvsCollection = { doc: jest.fn(() => cvDocRef) };

jest.mock('@/lib/firebase-admin', () => ({
  adminDb: {
    collection: jest.fn((name: string) =>
      name === 'cvs' ? cvsCollection : usersCollection,
    ),
  },
}));

function pdfFile(content = '%PDF-1.4 test cv content') {
  return new File([content], 'Alex CV.pdf', { type: 'application/pdf' });
}

function uploadRequest(
  options: { consent?: string | null; file?: File | null } = {},
) {
  const { consent = 'true', file = pdfFile() } = options;
  const formData = new FormData();
  if (consent !== null) formData.set('consent', consent);
  if (file) formData.set('file', file);
  return new Request('http://localhost/api/account/cv', {
    method: 'POST',
    body: formData,
  });
}

const deleteRequest = () =>
  new Request('http://localhost/api/account/cv', { method: 'DELETE' });

describe('/api/account/cv', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetRateLimits();
    mockGetTokens.mockResolvedValue({ decodedToken: { uid: 'user1' } });
    userDocRef.get.mockResolvedValue({
      exists: true,
      data: () => ({ isMember: true }),
    });
  });

  it('returns 401 when not authenticated', async () => {
    mockGetTokens.mockResolvedValue(null);
    const { POST, DELETE } = await import('@/app/api/account/cv/route');
    expect((await POST(uploadRequest() as never)).status).toBe(401);
    expect((await DELETE(deleteRequest() as never)).status).toBe(401);
  });

  it('requires explicit consent before storing anything', async () => {
    const { POST } = await import('@/app/api/account/cv/route');
    for (const consent of [null, 'false', 'yes']) {
      const res = await POST(uploadRequest({ consent }) as never);
      expect(res.status).toBe(400);
      expect((await res.json()).error).toMatch(/consent/i);
    }
    expect(mockStorageFile).not.toHaveBeenCalled();
    expect(cvDocRef.set).not.toHaveBeenCalled();
  });

  it('returns 403 for non-members', async () => {
    userDocRef.get.mockResolvedValue({
      exists: true,
      data: () => ({ isMember: false }),
    });
    const { POST } = await import('@/app/api/account/cv/route');
    const res = await POST(uploadRequest() as never);
    expect(res.status).toBe(403);
    expect(mockStorageFile).not.toHaveBeenCalled();
  });

  it('rejects files that are not PDFs', async () => {
    const { POST } = await import('@/app/api/account/cv/route');
    const res = await POST(
      uploadRequest({ file: pdfFile('not a pdf') }) as never,
    );
    expect(res.status).toBe(400);
    expect(mockStorageFile).not.toHaveBeenCalled();
  });

  it('stores the CV at the member path and records consent', async () => {
    const { POST } = await import('@/app/api/account/cv/route');
    const res = await POST(uploadRequest() as never);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(mockStorageFile).toHaveBeenCalledWith('cvs/user1/cv.pdf');
    expect(mockStorageSave).toHaveBeenCalled();
    expect(cvDocRef.set).toHaveBeenCalledWith(
      expect.objectContaining({
        path: 'cvs/user1/cv.pdf',
        fileName: 'Alex CV.pdf',
        consentVersion: CV_CONSENT_VERSION,
        consentAt: expect.any(String),
      }),
    );
    expect(body).toMatchObject({ id: 'user1', path: 'cvs/user1/cv.pdf' });
    // Sharing a CV switches partner contact on.
    expect(userDocRef.set).toHaveBeenCalledWith(
      { partnerContactOptIn: true, updatedAt: expect.any(String) },
      { merge: true },
    );
  });

  it('deletes the file before the consent record on withdrawal', async () => {
    const order: string[] = [];
    mockDeleteStorageFiles.mockImplementationOnce(async () => {
      order.push('file');
      return 1;
    });
    cvDocRef.delete.mockImplementationOnce(async () => {
      order.push('record');
    });
    const { DELETE } = await import('@/app/api/account/cv/route');
    const res = await DELETE(deleteRequest() as never);

    expect(res.status).toBe(200);
    expect(mockDeleteStorageFiles).toHaveBeenCalledWith(['cvs/user1/cv.pdf'], {
      failOnError: true,
    });
    expect(order).toEqual(['file', 'record']);
  });

  it('keeps the consent record when the file cannot be deleted', async () => {
    mockDeleteStorageFiles.mockRejectedValueOnce(new Error('storage down'));
    const error = jest.spyOn(console, 'error').mockImplementation(() => {});
    const { DELETE } = await import('@/app/api/account/cv/route');
    const res = await DELETE(deleteRequest() as never);

    expect(res.status).toBe(500);
    expect(cvDocRef.delete).not.toHaveBeenCalled();
    error.mockRestore();
  });
});
