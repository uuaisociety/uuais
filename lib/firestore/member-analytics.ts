import { collection, getCountFromServer } from 'firebase/firestore';
import { db } from '@/lib/firebase-client';
import { listUsers } from './users';

export interface MemberAnalytics {
  totalUsers: number;
  marketingOptIn: number;
  partnerContactOptIn: number;
  analyticsOptIn: number;
  lookingForJob: number;
  newsletter: number;
  /** Members with a CV shared to partners (cvs/{uid} docs). */
  sharedCvs: number;
  heardOfUs: Record<string, number>;
  /**
   * Who referred members, most referrals first. Names are free text, so
   * spellings differing only in case or spacing count as one person.
   */
  referrers: { name: string; count: number }[];
  gender: Record<string, number>;
  studentStatus: Record<string, number>;
  monthlySignups: { month: string; count: number }[];
}

function getMonthKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export async function getMemberAnalytics(): Promise<MemberAnalytics> {
  const [users, cvCount] = await Promise.all([
    listUsers(),
    getCountFromServer(collection(db, 'cvs')),
  ]);

  let marketingOptIn = 0;
  let partnerContactOptIn = 0;
  let analyticsOptIn = 0;
  let lookingForJob = 0;
  let newsletter = 0;

  const heardOfUs: Record<string, number> = {};
  const referrerMap: Record<string, { name: string; count: number }> = {};
  const gender: Record<string, number> = {};
  const studentStatus: Record<string, number> = {};
  const monthlyMap: Record<string, number> = {};

  for (const u of users) {
    if (u.marketingOptIn) marketingOptIn++;
    if (u.partnerContactOptIn) partnerContactOptIn++;
    if (u.analyticsOptIn) analyticsOptIn++;
    if (u.lookingForJob) lookingForJob++;
    if (u.newsletter) newsletter++;

    const how = u.heardOfUs?.trim();
    if (how) heardOfUs[how] = (heardOfUs[how] ?? 0) + 1;

    const referrer = u.referredBy?.trim().replace(/\s+/g, ' ');
    if (how === 'referral' && referrer) {
      const key = referrer.toLowerCase();
      referrerMap[key] ??= { name: referrer, count: 0 };
      referrerMap[key].count++;
    }

    const g = u.gender?.trim();
    if (g) gender[g] = (gender[g] ?? 0) + 1;

    const ss = u.studentStatus?.trim();
    if (ss) studentStatus[ss] = (studentStatus[ss] ?? 0) + 1;

    if (u.createdAt) {
      const key = getMonthKey(u.createdAt);
      monthlyMap[key] = (monthlyMap[key] ?? 0) + 1;
    }
  }

  const monthlySignups = Object.entries(monthlyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, count]) => ({ month, count }));

  const referrers = Object.values(referrerMap).sort(
    (a, b) => b.count - a.count || a.name.localeCompare(b.name),
  );

  return {
    totalUsers: users.length,
    marketingOptIn,
    partnerContactOptIn,
    analyticsOptIn,
    lookingForJob,
    newsletter,
    sharedCvs: cvCount.data().count,
    heardOfUs,
    referrers,
    gender,
    studentStatus,
    monthlySignups,
  };
}
