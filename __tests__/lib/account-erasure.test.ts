/**
 * @jest-environment node
 */
type Row = { id: string; data: Record<string, unknown> };
let store: Record<string, Row[]>;
let calls: string[];
let mappingIds: string[];

const mockListStored = jest.fn();
const mockDeleteFiles = jest.fn();
const mockDeleteUser = jest.fn();

const ref = (collection: string, id: string) => ({
  id,
  path: `${collection}/${id}`,
  delete: async () => {
    calls.push(`delete ${collection}/${id}`);
  },
});
const snap = (collection: string, r: Row) => ({
  id: r.id,
  ref: ref(collection, r.id),
  exists: true,
  data: () => r.data,
  get: (k: string) => r.data[k],
});
const rows = (name: string) => store[name] ?? [];

jest.mock('@/lib/firebase-admin', () => ({
  adminAuth: { deleteUser: (...a: unknown[]) => mockDeleteUser(...a) },
  adminDb: {
    collection: (name: string) => ({
      doc: (id: string) => ({
        ...ref(name, id),
        collection: (sub: string) => ({
          get: async () => ({
            docs: rows(`${name}/${id}/${sub}`).map((r) => snap(sub, r)),
          }),
        }),
      }),
      get: async () => ({ docs: rows(name).map((r) => snap(name, r)) }),
      where: (field: string, _op: string, value: unknown) => ({
        get: async () => ({
          docs: rows(name)
            .filter((r) => r.data[field] === value)
            .map((r) => snap(name, r)),
        }),
      }),
      listDocuments: async () => mappingIds.map((id) => ref(name, id)),
    }),
    runTransaction: async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        get: async (r: { path: string }) => {
          const [col, id] = r.path.split('/');
          const row = rows(col).find((x) => x.id === id);
          return row ? snap(col, row) : { exists: false, get: () => undefined };
        },
        delete: (r: { path: string }) => calls.push(`delete ${r.path}`),
        update: (r: { path: string }, data: Record<string, unknown>) =>
          calls.push(`update ${r.path} ${JSON.stringify(data)}`),
      }),
    recursiveDelete: async (r: { path: string }) =>
      calls.push(`recursiveDelete ${r.path}`),
    batch: () => ({ delete: () => {}, commit: async () => {} }),
  },
}));
jest.mock('@/lib/server-registration-files', () => ({
  collectRegistrationFilePaths: () => [],
  collectUserStorageFilePaths: (...a: unknown[]) => mockListStored(...a),
  deleteStorageFiles: (...a: unknown[]) => mockDeleteFiles(...a),
}));
jest.mock('@/lib/account-erasure-submissions', () => ({
  collectSubmissions: async () => ({ filePaths: [], refs: [] }),
}));

import { eraseAccount } from '@/lib/account-erasure';

describe('eraseAccount', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    calls = [];
    mappingIds = ['u1_cat', 'u1_orphan', 'u2_theirs', 'legacy-uuid'];
    store = {
      eventAttendance: [
        {
          id: 'e1',
          data: {
            entries: [
              { userId: 'u1', attended: true },
              { userId: 'u2', attended: true },
            ],
          },
        },
        { id: 'e2', data: { entries: [{ userId: 'u2', attended: true }] } },
      ],
      'course_categories/u1/categories': [
        { id: 'u1_cat', data: {} },
        { id: 'legacy-uuid', data: {} },
      ],
    };
    mockListStored.mockResolvedValue([]);
    mockDeleteFiles.mockResolvedValue(undefined);
    mockDeleteUser.mockResolvedValue(undefined);
  });

  it('deletes the CV consent record before anything else', async () => {
    await eraseAccount('u1');
    expect(calls[0]).toBe('delete cvs/u1');
  });

  it('stops, leaving the account, when stored files cannot be listed', async () => {
    mockListStored.mockRejectedValue(new Error('storage down'));
    await expect(eraseAccount('u1')).rejects.toThrow('storage down');
    expect(mockDeleteFiles).not.toHaveBeenCalled();
    expect(mockDeleteUser).not.toHaveBeenCalled();
  });

  it('removes only the member’s attendance entries, inside a transaction', async () => {
    await eraseAccount('u1');
    expect(calls).toContain(
      `update eventAttendance/e1 ${JSON.stringify({
        entries: [{ userId: 'u2', attended: true }],
      })}`,
    );
    expect(calls.filter((c) => c.includes('eventAttendance/e2'))).toEqual([]);
  });

  it('deletes course mappings of the member’s categories and orphans with their uid', async () => {
    await eraseAccount('u1');
    const swept = calls
      .filter((c) => c.startsWith('recursiveDelete category_courses/'))
      .sort();
    expect(swept).toEqual([
      'recursiveDelete category_courses/legacy-uuid',
      'recursiveDelete category_courses/u1_cat',
      'recursiveDelete category_courses/u1_orphan',
    ]);
  });
});
