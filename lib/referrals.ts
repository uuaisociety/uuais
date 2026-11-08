export type ReferrerCount = { name: string; count: number };

export const REFERRER_NAME_MAX = 200;

/** "How did you hear of us?" answers that ask for a name and count as a referral. */
export const REFERRAL_SOURCES = ['referral', 'friends'];

export function isReferralSource(heardOfUs: unknown): boolean {
  return (
    typeof heardOfUs === 'string' && REFERRAL_SOURCES.includes(heardOfUs.trim())
  );
}

/**
 * Cleans a typed referrer name. It can be shown publicly on the referral
 * leaderboard, so besides collapsing whitespace it is NFKC-normalised (so
 * full-width and other look-alike letters become plain ones), loses control,
 * invisible and text-direction characters and angle brackets, keeps at most
 * three stacked accents per letter, and is capped at REFERRER_NAME_MAX
 * characters. Anything that isn't a string becomes ''.
 */
export function sanitizeReferrerName(value: unknown): string {
  if (typeof value !== 'string') return '';
  const cleaned = value
    .normalize('NFKC')
    .replace(/\s/gu, ' ')
    .replace(/[\p{C}<>]/gu, '')
    .replace(/(\p{M}{3})\p{M}+/gu, '$1')
    .replace(/ {2,}/g, ' ')
    .trim();
  return Array.from(cleaned).slice(0, REFERRER_NAME_MAX).join('').trimEnd();
}

/**
 * Who referred members, most referrals first. Names are free text, so
 * spellings differing only in case or spacing count as one person. Shared by
 * the admin analytics page and /api/referrals so both always agree.
 */
export function rankReferrers(
  users: { heardOfUs?: unknown; referredBy?: unknown }[],
): ReferrerCount[] {
  // A Map, not an object: names are user input ("__proto__", "constructor").
  const byName = new Map<string, ReferrerCount>();
  for (const u of users) {
    const referrer = sanitizeReferrerName(u.referredBy);
    if (!isReferralSource(u.heardOfUs) || !referrer) continue;
    const key = referrer.toLowerCase();
    const entry = byName.get(key) ?? { name: referrer, count: 0 };
    entry.count++;
    byName.set(key, entry);
  }
  return [...byName.values()].sort(
    (a, b) => b.count - a.count || a.name.localeCompare(b.name),
  );
}
