// Integration test for POST/DELETE /api/account/cv with mocked Firebase dependencies.
import { createAuthMocks } from '@/__tests__/helpers/mocks';
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

const mockLog = jest.fn().mockResolvedValue(undefined);
jest.mock('@/lib/server-audit-log', () => ({
  logAdminAction: (...args: unknown[]) => mockLog(...args),
}));

// A tiny in-memory model of users/user1 and cvs/user1.
type Doc = Record<string, unknown> | null;
const db: { users: Doc; cvs: Doc } = { users: null, cvs: null };
const snap = (d: Doc) => ({
  exists: d !== null,
  data: () => d ?? undefined,
  get: (k: string) => d?.[k],
});
const ref = (name: 'users' | 'cvs') => ({
  get: jest.fn(async () => snap(db[name])),
  set: jest.fn(
    async (data: Record<string, unknown>, opts?: { merge?: boolean }) => {
      db[name] = opts?.merge ? { ...(db[name] ?? {}), ...data } : data;
    },
  ),
  update: jest.fn(async (data: Record<string, unknown>) => {
    db[name] = { ...(db[name] ?? {}), ...data };
  }),
  delete: jest.fn(async () => {
    db[name] = null;
  }),
});
const userRef = ref('users');
const cvRef = ref('cvs');

let liveEmailVerified = false;
jest.mock('@/lib/firebase-admin', () => ({
  adminAuth: {
    getUser: async () => ({ emailVerified: liveEmailVerified }),
  },
  adminDb: {
    collection: (name: string) => ({
      doc: () => (name === 'cvs' ? cvRef : userRef),
    }),
    runTransaction: async (
      fn: (tx: {
        get: (r: typeof userRef) => Promise<unknown>;
        set: (
          r: typeof userRef,
          d: Record<string, unknown>,
          o?: { merge?: boolean },
        ) => void;
      }) => Promise<unknown>,
    ) =>
      fn({
        get: (r) => r.get(),
        set: (r, d, o) => void r.set(d, o),
      }),
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
    mockGetTokens.mockResolvedValue({
      decodedToken: { uid: 'user1', email_verified: true },
    });
    liveEmailVerified = false;
    db.users = { isMember: true, partnerContactOptIn: false };
    db.cvs = null;
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
    expect(db.cvs).toBeNull();
  });

  it('requires a verified email before a CV can be shared', async () => {
    mockGetTokens.mockResolvedValue({ decodedToken: { uid: 'user1' } });
    const { POST } = await import('@/app/api/account/cv/route');
    const res = await POST(uploadRequest() as never);
    expect(res.status).toBe(403);
    expect((await res.json()).error).toMatch(/verified/);
    expect(mockStorageFile).not.toHaveBeenCalled();

    // A member who just linked Google is verified in Firebase before their token refreshes.
    liveEmailVerified = true;
    expect((await POST(uploadRequest() as never)).status).toBe(200);
  });

  it('returns 403 for non-members', async () => {
    db.users = { isMember: false };
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

  it('refuses a PDF with active content before storing it', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const { POST } = await import('@/app/api/account/cv/route');
    const res = await POST(
      uploadRequest({
        file: pdfFile(
          '%PDF-1.7\n1 0 obj << /OpenAction << /S /JavaScript /JS (x) >> >> endobj',
        ),
      }) as never,
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/plain PDF/);
    expect(mockStorageFile).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it('stores the CV, records consent, and switches partner contact on', async () => {
    const { POST } = await import('@/app/api/account/cv/route');
    const res = await POST(uploadRequest() as never);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(mockStorageFile).toHaveBeenCalledWith('cvs/user1/cv.pdf');
    expect(mockStorageSave).toHaveBeenCalled();
    expect(db.cvs).toMatchObject({
      path: 'cvs/user1/cv.pdf',
      fileName: 'Alex CV.pdf',
      consentVersion: CV_CONSENT_VERSION,
      consentAt: expect.any(String),
      priorPartnerContactOptIn: false,
    });
    expect(body).toMatchObject({ id: 'user1', path: 'cvs/user1/cv.pdf' });
    expect(db.users).toMatchObject({ partnerContactOptIn: true });
  });

  it('restores the member’s earlier partner-contact choice when the CV is removed', async () => {
    const { POST, DELETE } = await import('@/app/api/account/cv/route');
    await POST(uploadRequest() as never);
    expect(db.users).toMatchObject({ partnerContactOptIn: true });

    expect((await DELETE(deleteRequest() as never)).status).toBe(200);
    expect(db.cvs).toBeNull();
    expect(db.users).toMatchObject({ partnerContactOptIn: false });
  });

  it('records consent being given and withdrawn in the audit log', async () => {
    const { POST, DELETE } = await import('@/app/api/account/cv/route');
    await POST(uploadRequest() as never);
    await DELETE(deleteRequest() as never);
    expect(mockLog).toHaveBeenNthCalledWith(1, {
      action: 'consent-granted',
      adminUid: 'user1',
      path: 'cvs/user1/cv.pdf',
      consentVersion: CV_CONSENT_VERSION,
    });
    expect(mockLog).toHaveBeenNthCalledWith(2, {
      action: 'consent-withdrawn',
      adminUid: 'user1',
      path: 'cvs/user1/cv.pdf',
    });
  });

  it('keeps the original choice across a replacement upload', async () => {
    const { POST, DELETE } = await import('@/app/api/account/cv/route');
    await POST(uploadRequest() as never);
    await POST(uploadRequest() as never); // replace: opt-in is already on now
    expect(db.cvs).toMatchObject({ priorPartnerContactOptIn: false });
    await DELETE(deleteRequest() as never);
    expect(db.users).toMatchObject({ partnerContactOptIn: false });
  });

  it('does not resurrect a CV for an account erased mid-upload', async () => {
    const { POST } = await import('@/app/api/account/cv/route');
    // Profile exists at the membership check, gone by the final write.
    userRef.get
      .mockImplementationOnce(async () => snap({ isMember: true }))
      .mockImplementationOnce(async () => snap(null));
    const res = await POST(uploadRequest() as never);

    expect(res.status).toBe(409);
    expect(db.cvs).toBeNull();
    expect(mockDeleteStorageFiles).toHaveBeenCalledWith(['cvs/user1/cv.pdf']);
  });

  it('deletes the file before the consent record on withdrawal', async () => {
    db.cvs = { path: 'cvs/user1/cv.pdf', priorPartnerContactOptIn: true };
    const order: string[] = [];
    mockDeleteStorageFiles.mockImplementationOnce(async () => {
      order.push('file');
      return 1;
    });
    cvRef.delete.mockImplementationOnce(async () => {
      order.push('record');
      db.cvs = null;
    });
    const { DELETE } = await import('@/app/api/account/cv/route');
    const res = await DELETE(deleteRequest() as never);

    expect(res.status).toBe(200);
    expect(mockDeleteStorageFiles).toHaveBeenCalledWith(['cvs/user1/cv.pdf'], {
      failOnError: true,
    });
    expect(order).toEqual(['file', 'record']);
    expect(db.users).toMatchObject({ partnerContactOptIn: true });
  });

  it('keeps the consent record when the file cannot be deleted', async () => {
    db.cvs = { path: 'cvs/user1/cv.pdf' };
    mockDeleteStorageFiles.mockRejectedValueOnce(new Error('storage down'));
    const error = jest.spyOn(console, 'error').mockImplementation(() => {});
    const { DELETE } = await import('@/app/api/account/cv/route');
    const res = await DELETE(deleteRequest() as never);

    expect(res.status).toBe(500);
    expect(cvRef.delete).not.toHaveBeenCalled();
    expect(db.cvs).not.toBeNull();
    error.mockRestore();
  });
});
