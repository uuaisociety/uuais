const mockUpdateDoc = jest.fn().mockResolvedValue(undefined);
const mockAddDoc = jest.fn().mockResolvedValue({ id: 'created' });
const mockDeleteField = jest.fn(() => ({ __deleteField: true }));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(() => 'teamMembers'),
  query: jest.fn(() => 'query'),
  getDocs: jest.fn().mockResolvedValue({ docs: [] }),
  addDoc: (...args: unknown[]) => mockAddDoc(...args),
  updateDoc: (...args: unknown[]) => mockUpdateDoc(...args),
  deleteDoc: jest.fn(),
  onSnapshot: jest.fn(),
  doc: jest.fn((_db: unknown, collectionName: string, id: string) => ({ collectionName, id })),
  orderBy: jest.fn(),
  writeBatch: jest.fn(),
  deleteField: () => mockDeleteField(),
}));

jest.mock('@/lib/firebase-client', () => ({ db: {} }));

import { addTeamMember, updateTeamMember } from '@/lib/firestore/team';

describe('team member badges', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each([undefined, '', '   '])('deletes an explicitly cleared badge (%p)', async (badge) => {
    await updateTeamMember('member-1', { badge });
    expect(mockUpdateDoc).toHaveBeenCalledWith(
      { collectionName: 'teamMembers', id: 'member-1' },
      { badge: { __deleteField: true } },
    );
    expect(mockDeleteField).toHaveBeenCalledTimes(1);
  });

  it('preserves an existing badge when a partial update omits it', async () => {
    await updateTeamMember('member-1', { name: 'Alice Updated' });
    expect(mockUpdateDoc).toHaveBeenCalledWith(
      { collectionName: 'teamMembers', id: 'member-1' },
      { name: 'Alice Updated' },
    );
    expect(mockDeleteField).not.toHaveBeenCalled();
  });

  it('trims and writes a nonempty badge', async () => {
    await updateTeamMember('member-1', { badge: '  Lead  ' });
    expect(mockUpdateDoc.mock.calls[0][1]).toEqual({ badge: 'Lead' });
    expect(mockDeleteField).not.toHaveBeenCalled();
  });

  it('omits an empty badge when creating a member', async () => {
    await addTeamMember({ name: 'Alice', position: 'Developer', badge: '   ' });
    expect(mockAddDoc.mock.calls[0][1]).toEqual({
      name: 'Alice',
      position: 'Developer',
      order: 0,
    });
  });
});
