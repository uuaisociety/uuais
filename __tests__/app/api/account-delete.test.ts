// Integration tests for POST /api/account/delete (self-service erasure).
import { NextRequest } from 'next/server';
import { createAuthMocks } from '@/__tests__/helpers/mocks';

const { mockGetTokens, authEdgeFactory, authConfigFactory } = createAuthMocks();
jest.mock('next-firebase-auth-edge', () => authEdgeFactory);
jest.mock('@/lib/auth-config', () => authConfigFactory);
const mockCheckWindow = jest.fn(() => ({ allowed: true }));
jest.mock('@/lib/rate-limit-in-memory', () => ({
  checkWindow: (...args: unknown[]) => mockCheckWindow(...(args as [])),
}));

const mockCollectPaths = jest.fn(() => ['registrations/evt1/user1/a.pdf']);
const mockCollectUserStoragePaths = jest.fn().mockResolvedValue([]);
const mockDeleteStorageFiles = jest.fn().mockResolvedValue(1);
jest.mock('@/lib/server-registration-files', () => ({
  collectRegistrationFilePaths: (...args: unknown[]) =>
    mockCollectPaths(...args),
  collectUserStorageFilePaths: (...args: unknown[]) =>
    mockCollectUserStoragePaths(...args),
  deleteStorageFiles: (...args: unknown[]) => mockDeleteStorageFiles(...args),
}));

// Applications and showcase projects (collector covered in its own tests).
const mockCollectSubmissions = jest.fn();
jest.mock('@/lib/account-erasure-submissions', () => ({
  collectSubmissions: (...args: unknown[]) => mockCollectSubmissions(...args),
}));
const mockBatchDelete = jest.fn();
const mockBatchCommit = jest.fn().mockResolvedValue(undefined);

// Registration docs owned by user1, keyed by doc path.
let regs: Record<string, Record<string, unknown>>;
let eventCount: number;
const mockTxDelete = jest.fn();
const mockTxUpdate = jest.fn();
const mockRecursiveDelete = jest.fn().mockResolvedValue(undefined);
const mockAttendanceUpdate = jest.fn().mockResolvedValue(undefined);
const mockDeleteUser = jest.fn().mockResolvedValue(undefined);
const mockRegsGet = jest.fn();

const eventRef = { path: 'events/evt1' };
const docRef = (path: string) => ({ path });

jest.mock('@/lib/firebase-admin', () => ({
  adminAuth: { deleteUser: (...args: unknown[]) => mockDeleteUser(...args) },
  adminDb: {
    batch: () => ({ delete: mockBatchDelete, commit: mockBatchCommit }),
    recursiveDelete: (...args: unknown[]) => mockRecursiveDelete(...args),
    runTransaction: async (
      fn: (tx: {
        get: (ref: { path: string }) => Promise<unknown>;
        delete: typeof mockTxDelete;
        update: typeof mockTxUpdate;
      }) => Promise<unknown>,
    ) =>
      fn({
        get: async (ref) => {
          if (ref.path === 'events/evt1')
            return {
              exists: true,
              get: () => eventCount,
            };
          if (ref.path === 'showcaseVotes/p9_user1')
            return {
              exists: true,
              get: (key: string) => (key === 'projectId' ? 'p9' : undefined),
            };
          if (ref.path === 'showcaseProjects/p9')
            return { exists: true, get: () => 3 };
          const data = regs[ref.path];
          return {
            exists: !!data,
            get: (key: string) => data?.[key],
          };
        },
        delete: mockTxDelete,
        update: mockTxUpdate,
      }),
    collection: jest.fn((name: string) => {
      if (name === 'registrations')
        return { where: () => ({ get: mockRegsGet }) };
      if (name === 'events') return { doc: () => eventRef };
      if (name === 'eventAttendance')
        return {
          get: jest.fn().mockResolvedValue({
            docs: [
              {
                get: (key: string) =>
                  key === 'entries'
                    ? [
                        { userId: 'user1', attended: true },
                        { userId: 'other', attended: false },
                      ]
                    : undefined,
                ref: { update: mockAttendanceUpdate },
              },
            ],
          }),
        };
      if (name === 'showcaseVotes')
        return {
          where: () => ({
            get: jest.fn().mockResolvedValue({
              docs: [{ ref: docRef('showcaseVotes/p9_user1') }],
            }),
          }),
        };
      if (name === 'course_categories')
        return {
          doc: (id: string) => ({
            ...docRef(`course_categories/${id}`),
            collection: () => ({
              get: jest.fn().mockResolvedValue({ docs: [{ id: 'cat1' }] }),
            }),
          }),
        };
      return { doc: (id: string) => docRef(`${name}/${id}`) };
    }),
  },
}));

async function erase() {
  const { POST } = await import('@/app/api/account/delete/route');
  return POST(
    new NextRequest('http://localhost/api/account/delete', {
      method: 'POST',
    }),
  );
}

describe('POST /api/account/delete', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetTokens.mockResolvedValue({ decodedToken: { uid: 'user1' } });
    mockCheckWindow.mockReturnValue({ allowed: true });
    mockCollectSubmissions.mockResolvedValue({ filePaths: [], refs: [] });
    eventCount = 5;
    regs = {
      'registrations/reg1': {
        userId: 'user1',
        eventId: 'evt1',
        status: 'registered',
      },
    };
    mockRegsGet.mockImplementation(async () => ({
      docs: Object.entries(regs).map(([path, data]) => ({
        ref: docRef(path),
        data: () => data,
      })),
    }));
  });

  it('returns 401 when not authenticated', async () => {
    mockGetTokens.mockResolvedValue(null);
    const res = await erase();
    expect(res.status).toBe(401);
    expect(mockDeleteUser).not.toHaveBeenCalled();
  });

  it('returns 429 when rate limited', async () => {
    mockCheckWindow.mockReturnValue({ allowed: false });
    const res = await erase();
    expect(res.status).toBe(429);
    expect(mockDeleteUser).not.toHaveBeenCalled();
  });

  it('deletes registrations, files, attendance, personal data, and auth', async () => {
    const res = await erase();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ success: true });
    expect(mockDeleteStorageFiles).toHaveBeenCalledWith(
      ['registrations/evt1/user1/a.pdf', 'cvs/user1/cv.pdf'],
      { failOnError: true },
    );
    expect(mockTxDelete).toHaveBeenCalledWith(docRef('registrations/reg1'));
    expect(mockAttendanceUpdate).toHaveBeenCalledWith({
      entries: [{ userId: 'other', attended: false }],
    });
    expect(mockTxDelete).toHaveBeenCalledWith(docRef('showcaseVotes/p9_user1'));
    // The member's votes come off the projects' counters, as an unvote would.
    expect(mockTxUpdate).toHaveBeenCalledWith(docRef('showcaseProjects/p9'), {
      votes: 2,
    });
    const recursivePaths = mockRecursiveDelete.mock.calls.map(
      ([ref]) => (ref as { path: string }).path,
    );
    expect(recursivePaths).toEqual(
      expect.arrayContaining([
        'category_courses/cat1',
        'course_categories/user1',
        'favorites/user1',
        'ai_chats/user1',
        'programProgress/user1',
        'cvs/user1',
        'users/user1',
      ]),
    );
    expect(mockDeleteUser).toHaveBeenCalledWith('user1');
  });

  it('releases the seat held by a counted registration', async () => {
    await erase();
    expect(mockTxUpdate).toHaveBeenCalledWith(eventRef, {
      currentRegistrations: 4,
    });
  });

  it('does not release a seat for waitlisted registrations', async () => {
    regs['registrations/reg1'].status = 'waitlist';
    await erase();
    expect(mockTxDelete).toHaveBeenCalled();
    expect(mockTxUpdate).not.toHaveBeenCalledWith(eventRef, expect.anything());
  });

  it('includes orphaned files found under the user storage prefix', async () => {
    mockCollectUserStoragePaths.mockResolvedValueOnce([
      'registrations/evt1/user1/orphan.pdf',
      'registrations/evt1/user1/a.pdf',
    ]);
    const res = await erase();
    expect(res.status).toBe(200);
    expect(mockDeleteStorageFiles).toHaveBeenCalledWith(
      [
        'registrations/evt1/user1/a.pdf',
        'registrations/evt1/user1/orphan.pdf',
        'cvs/user1/cv.pdf',
      ],
      { failOnError: true },
    );
  });

  it('erases applications and showcase work: their files first, then their documents', async () => {
    const order: string[] = [];
    mockCollectSubmissions.mockResolvedValue({
      filePaths: ['team-applications/1_cv.pdf', 'showcase/user1/cover.png'],
      refs: [docRef('teamApplications/a1'), docRef('showcaseProjects/p1')],
    });
    mockDeleteStorageFiles.mockImplementation(async () => {
      order.push('files');
      return 1;
    });
    mockBatchCommit.mockImplementation(async () => {
      order.push('docs');
    });
    const res = await erase();

    expect(res.status).toBe(200);
    expect(mockCollectSubmissions).toHaveBeenCalledWith('user1');
    expect(mockDeleteStorageFiles.mock.calls[0][0]).toEqual(
      expect.arrayContaining([
        'team-applications/1_cv.pdf',
        'showcase/user1/cover.png',
      ]),
    );
    expect(mockBatchDelete).toHaveBeenCalledWith(docRef('teamApplications/a1'));
    expect(mockBatchDelete).toHaveBeenCalledWith(docRef('showcaseProjects/p1'));
    expect(order.indexOf('files')).toBeLessThan(order.indexOf('docs'));
    mockDeleteStorageFiles.mockImplementation(async () => 1);
  });

  it('keeps the account when file deletion fails', async () => {
    mockDeleteStorageFiles.mockRejectedValueOnce(new Error('storage down'));
    const error = jest.spyOn(console, 'error').mockImplementation(() => {});
    const res = await erase();
    expect(res.status).toBe(500);
    expect(mockTxDelete).not.toHaveBeenCalled();
    expect(mockDeleteUser).not.toHaveBeenCalled();
    error.mockRestore();
  });

  it('returns 500 when the auth account cannot be deleted, so the user can retry', async () => {
    mockDeleteUser.mockRejectedValueOnce(new Error('auth unavailable'));
    const error = jest.spyOn(console, 'error').mockImplementation(() => {});
    const res = await erase();
    expect(res.status).toBe(500);
    error.mockRestore();
  });

  it('succeeds on retry when the auth account is already gone', async () => {
    mockDeleteUser.mockRejectedValueOnce({ code: 'auth/user-not-found' });
    const res = await erase();
    expect(res.status).toBe(200);
  });

  it('returns 500 when registration lookup fails', async () => {
    mockRegsGet.mockRejectedValueOnce(new Error('db down'));
    const error = jest.spyOn(console, 'error').mockImplementation(() => {});
    const res = await erase();
    expect(res.status).toBe(500);
    expect(mockDeleteUser).not.toHaveBeenCalled();
    error.mockRestore();
  });
});
