const mockSelectedFields = jest.fn();
const mockGetAll = jest.fn();
const mockSourceDocs = [
  {
    id: 'board-legacy',
    data: () => ({
      name: 'Legacy board',
      published: true,
      personalEmail: 'private@example.com',
    }),
  },
  {
    id: 'research-2026',
    data: () => ({ teams: ['research'], years: [2026], published: true }),
  },
  {
    id: 'draft',
    data: () => ({ teams: ['research'], years: [2026], published: false }),
  },
];
const mockCurrentDocs: Record<
  string,
  { id: string; exists: boolean; data: () => Record<string, unknown> }
> = {
  'board-legacy': {
    id: 'board-legacy',
    exists: true,
    data: () => ({
      name: 'Legacy board',
      published: true,
      personalEmail: 'private@example.com',
      order: 2,
    }),
  },
  'research-2026': {
    id: 'research-2026',
    exists: true,
    data: () => ({
      name: 'Research profile',
      teams: ['research'],
      years: [2026],
      published: true,
      order: 1,
      notes: 'private',
    }),
  },
  draft: {
    id: 'draft',
    exists: true,
    data: () => ({
      name: 'Draft',
      teams: ['research'],
      years: [2026],
      published: false,
    }),
  },
};

jest.mock('@/lib/firebase-admin', () => ({
  adminDb: {
    collection: () => ({
      select: (...fields: string[]) => {
        mockSelectedFields(...fields);
        return { get: async () => ({ docs: mockSourceDocs }) };
      },
      doc: (id: string) => ({ id }),
    }),
    getAll: (...refs: Array<{ id: string }>) => mockGetAll(...refs),
  },
}));

import {
  getPublicTeamDirectoryIndex,
  getPublicTeamMembersForSelection,
  publicTeamIdsForSelection,
} from '@/lib/server-data';

describe('public team directory source', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAll.mockImplementation((...refs: Array<{ id: string }>) =>
      refs.map((ref) => mockCurrentDocs[ref.id]),
    );
  });

  it('reads only directory fields and preserves legacy board/year eligibility in metadata', async () => {
    const index = await getPublicTeamDirectoryIndex();
    expect(mockSelectedFields).toHaveBeenCalledWith(
      'teams',
      'years',
      'published',
    );
    expect(index.metadata.years).toEqual([2026]);
    expect(index.metadata.countsByYear.all.board).toBe(1);
    expect(index.metadata.countsByYear['2026'].board).toBe(1);
    expect(index.metadata.countsByYear['2026'].research).toBe(1);
    expect(index.rows.map(({ id }) => id)).toEqual([
      'board-legacy',
      'research-2026',
    ]);
    expect(publicTeamIdsForSelection(index.rows, 'board', 2026)).toEqual([
      'board-legacy',
    ]);
  });

  it('fetches only requested IDs and rechecks current eligibility before public projection', async () => {
    const members = await getPublicTeamMembersForSelection('research', 2026, [
      'research-2026',
      'draft',
    ]);
    expect(
      mockGetAll.mock.calls[0].map((ref: { id: string }) => ref.id),
    ).toEqual(['research-2026', 'draft']);
    expect(members).toEqual([
      expect.objectContaining({
        id: 'research-2026',
        name: 'Research profile',
      }),
    ]);
    expect(members[0]).not.toHaveProperty('notes');
    expect(members[0]).not.toHaveProperty('personalEmail');
  });

  it('drops profiles whose group/year changed after cached metadata was built', async () => {
    mockCurrentDocs['research-2026'] = {
      id: 'research-2026',
      exists: true,
      data: () => ({
        name: 'Moved',
        teams: ['board'],
        years: [2025],
        published: true,
      }),
    };
    await expect(
      getPublicTeamMembersForSelection('research', 2026, ['research-2026']),
    ).resolves.toEqual([]);
  });
});
