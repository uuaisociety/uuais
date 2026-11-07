import { rankReferrers } from '@/lib/referrals';

describe('rankReferrers', () => {
  it('counts names that clash with Object properties without polluting them', () => {
    const ranked = rankReferrers([
      { heardOfUs: 'referral', referredBy: '__proto__' },
      { heardOfUs: 'referral', referredBy: 'constructor' },
      { heardOfUs: 'referral', referredBy: 'constructor' },
    ]);
    expect(ranked).toEqual([
      { name: 'constructor', count: 2 },
      { name: '__proto__', count: 1 },
    ]);
    expect(({} as { count?: unknown }).count).toBeUndefined();
  });
});
