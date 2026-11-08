import {
  rankReferrers,
  REFERRER_NAME_MAX,
  sanitizeReferrerName,
} from '@/lib/referrals';

describe('sanitizeReferrerName', () => {
  it.each([
    ['plain names', 'Ada Lovelace', 'Ada Lovelace'],
    ['accents and apostrophes', "Åsa Ö'Brien-Lind", "Åsa Ö'Brien-Lind"],
    ['outer and inner whitespace', '  Ada \t\n  Lovelace  ', 'Ada Lovelace'],
    ['zero-width characters', 'A\u200Bd\u200Da\uFEFF', 'Ada'],
    ['text-direction overrides', '\u202Eecalevol ada\u202C', 'ecalevol ada'],
    ['control characters', 'Ada\u0000\u0007\u001B[31m', 'Ada[31m'],
    [
      'angle brackets',
      '<script>alert(1)</script>Bo',
      'scriptalert(1)/scriptBo',
    ],
    ['full-width look-alikes', 'Ａｄａ', 'Ada'],
    [
      'stacked accents beyond three',
      'x\u0301\u0302\u0303\u0304\u0305',
      'x\u0301\u0302\u0303',
    ],
    ['a lone surrogate', 'Bo\uD800', 'Bo'],
  ])('handles %s', (_, input, expected) => {
    expect(sanitizeReferrerName(input)).toBe(expected);
  });

  it('keeps emoji', () => {
    expect(sanitizeReferrerName('Bo 🚀')).toBe('Bo 🚀');
  });

  it('caps the length without splitting characters', () => {
    const out = sanitizeReferrerName('🚀'.repeat(REFERRER_NAME_MAX + 50));
    expect(Array.from(out)).toHaveLength(REFERRER_NAME_MAX);
    expect(out).toBe('🚀'.repeat(REFERRER_NAME_MAX));
  });

  it.each([undefined, null, 42, {}, ['Ada']])('turns %p into ""', (value) => {
    expect(sanitizeReferrerName(value)).toBe('');
  });

  it('is stable when applied twice', () => {
    const once = sanitizeReferrerName(' Ａda\u200B  <b>Lovelace</b> ');
    expect(sanitizeReferrerName(once)).toBe(once);
  });
});

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

  it('counts "Friends" answers as referrals, but no other source', () => {
    const ranked = rankReferrers([
      { heardOfUs: 'referral', referredBy: 'Ada' },
      { heardOfUs: 'friends', referredBy: 'ada' },
      { heardOfUs: 'instagram', referredBy: 'Ada' },
      { heardOfUs: 'friends' },
    ]);
    expect(ranked).toEqual([{ name: 'Ada', count: 2 }]);
  });

  it('skips non-string values instead of throwing', () => {
    const ranked = rankReferrers([
      { heardOfUs: 'referral', referredBy: 42 },
      { heardOfUs: 'referral', referredBy: { name: 'Ada' } },
      { heardOfUs: ['referral'], referredBy: 'Ada' },
      { heardOfUs: 'referral', referredBy: 'Bo' },
    ]);
    expect(ranked).toEqual([{ name: 'Bo', count: 1 }]);
  });

  it('groups names that only differ by invisible or look-alike characters', () => {
    const ranked = rankReferrers([
      { heardOfUs: 'referral', referredBy: 'Ada' },
      { heardOfUs: 'referral', referredBy: 'A\u200Bda' },
      { heardOfUs: 'referral', referredBy: 'Ａｄａ' },
      { heardOfUs: 'referral', referredBy: '\u200B\u202E' },
    ]);
    expect(ranked).toEqual([{ name: 'Ada', count: 3 }]);
  });
});
