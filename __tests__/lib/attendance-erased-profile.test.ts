// Marking attendance must never recreate the profile of an erased member.
const mockSet = jest.fn();
let userExists = true;
jest.mock('firebase/firestore', () => ({
  doc: jest.fn((_db: unknown, ...path: string[]) => ({ path: path.join('/') })),
  onSnapshot: jest.fn(),
  runTransaction: jest.fn(async (_db: unknown, fn: (tx: unknown) => unknown) =>
    fn({
      get: async (ref: { path: string }) =>
        ref.path.startsWith('users/')
          ? { exists: () => userExists, data: () => ({}) }
          : { exists: () => false, data: () => ({}) },
      set: (ref: { path: string }, data: unknown) => mockSet(ref.path, data),
    }),
  ),
}));
jest.mock('@/lib/firebase-client', () => ({ db: {} }));

import { setAttendanceForUser } from '@/lib/firestore/attendance';

describe('setAttendanceForUser', () => {
  beforeEach(() => {
    mockSet.mockClear();
    userExists = true;
  });

  it('records attendance and the history on an existing profile', async () => {
    await setAttendanceForUser('e1', 'u1', true);
    expect(mockSet.mock.calls.map((c) => c[0])).toEqual([
      'eventAttendance/e1',
      'users/u1',
    ]);
  });

  it('leaves a missing profile missing', async () => {
    userExists = false;
    await setAttendanceForUser('e1', 'u1', true);
    expect(mockSet.mock.calls.map((c) => c[0])).toEqual(['eventAttendance/e1']);
  });
});
