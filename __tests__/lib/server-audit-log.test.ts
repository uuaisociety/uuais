/**
 * @jest-environment node
 */
const mockAdd = jest.fn().mockResolvedValue(undefined);
let pages: { ref: string }[][];
const mockBatchDelete = jest.fn();
const mockWhere = jest.fn();
jest.mock('@/lib/firebase-admin', () => ({
  adminDb: {
    collection: () => ({
      add: (...a: unknown[]) => mockAdd(...a),
      where: (...a: unknown[]) => {
        mockWhere(...a);
        return {
          limit: () => ({
            get: async () => {
              const docs = pages.shift() ?? [];
              return { empty: docs.length === 0, size: docs.length, docs };
            },
          }),
        };
      },
    }),
    batch: () => ({ delete: mockBatchDelete, commit: async () => undefined }),
  },
}));

import {
  AUDIT_LOG_RETENTION_MS,
  logAdminAction,
  purgeExpiredAuditLogs,
} from '@/lib/server-audit-log';

describe('audit log retention', () => {
  beforeEach(() => jest.clearAllMocks());

  it('stamps every entry with an expiry 30 days out, for a TTL policy', async () => {
    const before = Date.now();
    await logAdminAction({
      action: 'download',
      adminUid: 'a1',
      path: 'cvs/u/cv.pdf',
    });
    const payload = mockAdd.mock.calls[0][0];
    const expires = payload.expireAt.toMillis();
    expect(AUDIT_LOG_RETENTION_MS).toBe(30 * 24 * 60 * 60 * 1000);
    expect(expires).toBeGreaterThanOrEqual(before + AUDIT_LOG_RETENTION_MS);
    expect(expires).toBeLessThan(before + AUDIT_LOG_RETENTION_MS + 60_000);
  });

  it('rethrows a failed write only when logging is required', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    mockAdd.mockRejectedValueOnce(new Error('down'));
    await expect(
      logAdminAction({ action: 'update', adminUid: 'a1' }),
    ).resolves.toBeUndefined();
    mockAdd.mockRejectedValueOnce(new Error('down'));
    await expect(
      logAdminAction(
        { action: 'download', adminUid: 'a1' },
        { required: true },
      ),
    ).rejects.toThrow('down');
    warn.mockRestore();
  });

  it('deletes entries older than 30 days, page by page', async () => {
    pages = [[{ ref: 'l1' }, { ref: 'l2' }], [{ ref: 'l3' }], []];
    const before = Date.now();
    expect(await purgeExpiredAuditLogs()).toBe(3);
    expect(mockBatchDelete).toHaveBeenCalledTimes(3);
    const [field, op, cutoff] = mockWhere.mock.calls[0];
    expect([field, op]).toEqual(['createdAt', '<']);
    expect(
      Math.abs(cutoff.toMillis() - (before - AUDIT_LOG_RETENTION_MS)),
    ).toBeLessThan(60_000);
  });
});
