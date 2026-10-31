// DELETE /api/admin/board-applications: admin-only, removes the doc and its
// board-application files only, and is audit-logged.
import { createAuthMocks } from '@/__tests__/helpers/mocks';

const { mockGetTokens, authEdgeFactory, authConfigFactory } = createAuthMocks();
jest.mock('next-firebase-auth-edge', () => authEdgeFactory);
jest.mock('@/lib/auth-config', () => authConfigFactory);

const mockAppRef = { delete: jest.fn(), get: jest.fn() };
const mockDoc = jest.fn(() => mockAppRef);
jest.mock('@/lib/firebase-admin', () => ({
  adminDb: { collection: () => ({ doc: mockDoc }) },
}));

const mockFileDelete = jest.fn().mockResolvedValue(undefined);
const mockStorageFile = jest.fn(() => ({ delete: mockFileDelete }));
jest.mock('firebase-admin', () => ({
  storage: () => ({ bucket: () => ({ file: mockStorageFile }) }),
}));

const mockLog = jest.fn().mockResolvedValue(undefined);
jest.mock('@/lib/server-audit-log', () => ({
  logAdminAction: (...args: unknown[]) => mockLog(...args),
}));

const remove = (body: unknown) =>
  new Request('http://localhost/api/admin/board-applications', {
    method: 'DELETE',
    body: JSON.stringify(body),
  }) as never;

describe('DELETE /api/admin/board-applications', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAppRef.delete.mockResolvedValue(undefined);
    mockAppRef.get.mockResolvedValue({
      exists: true,
      data: () => ({
        cv: { path: 'board-applications/1_cv.pdf' },
        coverFile: { path: 'cvs/victim/cv.pdf' },
      }),
    });
    mockGetTokens.mockResolvedValue({
      decodedToken: { uid: 'admin', admin: true },
    });
  });

  it('refuses non-admins', async () => {
    const { DELETE } = await import('@/app/api/admin/board-applications/route');
    mockGetTokens.mockResolvedValue(null);
    expect((await DELETE(remove({ id: 'b1' }))).status).toBe(401);
    mockGetTokens.mockResolvedValue({ decodedToken: { uid: 'u1' } });
    expect((await DELETE(remove({ id: 'b1' }))).status).toBe(403);
    expect(mockAppRef.delete).not.toHaveBeenCalled();
  });

  it('rejects ids that are not plain document ids', async () => {
    const { DELETE } = await import('@/app/api/admin/board-applications/route');
    for (const id of [undefined, 'a/b/c', '', 7])
      expect((await DELETE(remove({ id }))).status).toBe(400);
    expect(mockAppRef.delete).not.toHaveBeenCalled();
  });

  it('deletes the doc and only its board-application files, and logs it', async () => {
    const { DELETE } = await import('@/app/api/admin/board-applications/route');
    expect((await DELETE(remove({ id: 'b1' }))).status).toBe(200);
    expect(mockDoc).toHaveBeenCalledWith('b1');
    expect(mockAppRef.delete).toHaveBeenCalled();
    expect(mockStorageFile).toHaveBeenCalledTimes(1);
    expect(mockStorageFile).toHaveBeenCalledWith('board-applications/1_cv.pdf');
    expect(mockLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'remove',
        adminUid: 'admin',
        path: 'boardApplications/b1',
      }),
    );
  });
});
