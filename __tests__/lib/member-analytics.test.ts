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

describe('getMemberAnalytics daily signups', () => {
  it('counts signups per local calendar day, oldest first', async () => {
    const at = (y: number, m: number, d: number, h: number) =>
      new Date(y, m - 1, d, h).toISOString();
    mockListUsers.mockResolvedValue([
      { id: '1', createdAt: at(2026, 11, 3, 23) },
      { id: '2', createdAt: at(2026, 11, 2, 9) },
      { id: '3', createdAt: at(2026, 11, 3, 0) },
      { id: '4' },
    ]);
    expect((await getMemberAnalytics()).dailySignups).toEqual([
      { date: '2026-11-02', count: 1 },
      { date: '2026-11-03', count: 2 },
    ]);
  });
});
