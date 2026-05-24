import { listUsers } from './users';

export interface MemberAnalytics {
  totalUsers: number;
  marketingOptIn: number;
  partnerContactOptIn: number;
  analyticsOptIn: number;
  lookingForJob: number;
  newsletter: number;
  heardOfUs: Record<string, number>;
  gender: Record<string, number>;
  studentStatus: Record<string, number>;
  monthlySignups: { month: string; count: number }[];
}

function getMonthKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export async function getMemberAnalytics(): Promise<MemberAnalytics> {
  const users = await listUsers();

  let marketingOptIn = 0;
  let partnerContactOptIn = 0;
  let analyticsOptIn = 0;
  let lookingForJob = 0;
  let newsletter = 0;

  const heardOfUs: Record<string, number> = {};
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

  return {
    totalUsers: users.length,
    marketingOptIn,
    partnerContactOptIn,
    analyticsOptIn,
    lookingForJob,
    newsletter,
    heardOfUs,
    gender,
    studentStatus,
    monthlySignups,
  };
}
