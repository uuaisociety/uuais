export type ReferrerCount = { name: string; count: number };

/**
 * Who referred members, most referrals first. Names are free text, so
 * spellings differing only in case or spacing count as one person. Shared by
 * the admin analytics page and /api/referrals so both always agree.
 */
export function rankReferrers(
  users: { heardOfUs?: string; referredBy?: string }[],
): ReferrerCount[] {
  // A Map, not an object: names are user input ("__proto__", "constructor").
  const byName = new Map<string, ReferrerCount>();
  for (const u of users) {
    const referrer = u.referredBy?.trim().replace(/\s+/g, ' ');
    if (u.heardOfUs?.trim() !== 'referral' || !referrer) continue;
    const key = referrer.toLowerCase();
    const entry = byName.get(key) ?? { name: referrer, count: 0 };
    entry.count++;
    byName.set(key, entry);
  }
  return [...byName.values()].sort(
    (a, b) => b.count - a.count || a.name.localeCompare(b.name),
  );
}
