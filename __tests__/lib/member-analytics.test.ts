const mockListUsers = jest.fn();

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  getCountFromServer: async () => ({ data: () => ({ count: 0 }) }),
}));
jest.mock('@/lib/firebase-client', () => ({ db: {} }));
jest.mock('@/lib/firestore/users', () => ({
  listUsers: () => mockListUsers(),
}));

import { getMemberAnalytics } from '@/lib/firestore/member-analytics';

describe('getMemberAnalytics referrers', () => {
  it('ranks referrers, grouping spellings that differ in case or spacing', async () => {
    mockListUsers.mockResolvedValue([
      { id: '1', heardOfUs: 'referral', referredBy: 'Ada Lovelace' },
      { id: '2', heardOfUs: 'referral', referredBy: '  ada   lovelace ' },
      { id: '3', heardOfUs: 'referral', referredBy: 'Bo' },
      { id: '4', heardOfUs: 'referral', referredBy: 'Alan' },
      { id: '5', heardOfUs: 'referral', referredBy: 'ADA LOVELACE' },
      { id: '6', heardOfUs: 'referral', referredBy: 'Bo' },
    ]);
    const { referrers } = await getMemberAnalytics();
    expect(referrers).toEqual([
      { name: 'Ada Lovelace', count: 3 },
      { name: 'Bo', count: 2 },
      { name: 'Alan', count: 1 },
    ]);
  });

  it('skips blank names and members who did not come by referral', async () => {
    mockListUsers.mockResolvedValue([
      { id: '1', heardOfUs: 'referral', referredBy: '   ' },
      { id: '2', heardOfUs: 'referral' },
      { id: '3', heardOfUs: 'instagram', referredBy: 'Ada' },
      { id: '4', referredBy: 'Ada' },
    ]);
    expect((await getMemberAnalytics()).referrers).toEqual([]);
  });
});
