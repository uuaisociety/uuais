import { collection, onSnapshot, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { db, refreshSessionCookie } from '@/lib/firebase-client';
import { TeamApplication, RoleChoice } from '@/types';
import { ensureString, ensureNumber } from './utils';

const COLLECTION = 'teamApplications';

function ensureStringArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.map((x) => String(x));
  return [];
}

function ensureStringRecord(v: unknown): Record<string, string | string[]> {
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    const obj = v as Record<string, unknown>;
    const out: Record<string, string | string[]> = {};
    Object.keys(obj).forEach((k) => {
      const val = obj[k];
      if (typeof val === 'string') out[k] = val;
      else if (Array.isArray(val)) out[k] = val.map((x) => String(x));
    });
    return out;
  }
  return {};
}

function ensureRoleChoices(v: unknown): RoleChoice[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const out: RoleChoice[] = [];
  v.forEach((entry) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return;
    const e = entry as Record<string, unknown>;
    const roleId = ensureString(e.roleId);
    const teamId = ensureString(e.teamId);
    const justification = ensureString(e.justification);
    if (!roleId || !teamId) return;
    out.push({ roleId, teamId, justification });
  });
  return out.length > 0 ? out : undefined;
}

function docToApplication(id: string, data: Record<string, unknown>): TeamApplication {
  return {
    id,
    campaignId: ensureString(data.campaignId),
    name: ensureString(data.name),
    email: ensureString(data.email),
    emailNormalized: ensureString(data.emailNormalized) || undefined,
    uid: typeof data.uid === 'string' ? data.uid : undefined,
    gender: typeof data.gender === 'string' ? data.gender : undefined,
    university: typeof data.university === 'string' ? data.university : undefined,
    program: typeof data.program === 'string' ? data.program : undefined,
    graduationYear: typeof data.graduationYear === 'string' ? data.graduationYear : undefined,
    linkedin: typeof data.linkedin === 'string' ? data.linkedin : undefined,
    resume: typeof data.resume === 'object' ? (data.resume as { path?: string; url?: string } | null) : null,
    interests: ensureStringArray(data.interests),
    roleRanking: ensureRoleChoices(data.roleRanking),
    teamRanking: ensureStringArray(data.teamRanking),
    customTeam: typeof data.customTeam === 'string' ? data.customTeam : undefined,
    customRole: typeof data.customRole === 'string' ? data.customRole : undefined,
    weeklyHours: typeof data.weeklyHours === 'number' ? data.weeklyHours : ensureNumber(data.weeklyHours, 0),
    motivation: typeof data.motivation === 'string' ? data.motivation : undefined,
    customAnswers: ensureStringRecord(data.customAnswers),
    agree: typeof data.agree === 'boolean' ? data.agree : undefined,
    newsletter: typeof data.newsletter === 'boolean' ? data.newsletter : undefined,
    updatedAt: data.updatedAt as string | Timestamp | undefined,
    createdAt: data.createdAt as string | Timestamp | undefined,
  };
}

function applicationSortKey(createdAt: TeamApplication['createdAt']): number {
  if (!createdAt) return 0;
  if (typeof createdAt === 'string') {
    const t = new Date(createdAt).getTime();
    return Number.isNaN(t) ? 0 : t;
  }
  if (createdAt instanceof Timestamp) return createdAt.toMillis();
  return 0;
}

export async function deleteTeamApplication(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, id));
}

// Admin deletion: also removes lock/limits docs + resume via the API route (Storage).
export async function deleteTeamApplicationWithLimits(
  id: string,
  emailNormalized: string,
  campaignId: string,
): Promise<void> {
  // Refresh the httpOnly session cookie so the admin claim stays current (cookie minted pre-grant returns 403).
  try {
    await refreshSessionCookie();
  } catch { /* best-effort; the delete call surfaces auth errors */ }
  const res = await fetch('/api/admin/team-applications', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, emailNormalized, campaignId }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error || `Failed to delete application (${res.status})`);
  }
}

export function subscribeToTeamApplications(callback: (applications: TeamApplication[]) => void) {
  return onSnapshot(collection(db, COLLECTION), (snapshot) => {
    const list = snapshot.docs.map((d) => docToApplication(d.id, d.data() as Record<string, unknown>));
    list.sort((a, b) => applicationSortKey(b.createdAt) - applicationSortKey(a.createdAt));
    callback(list);
  });
}

export async function listTeamApplicationsByCampaign(campaignId: string): Promise<TeamApplication[]> {
  const { getDocs, query, where } = await import('firebase/firestore');
  const q = query(collection(db, COLLECTION), where('campaignId', '==', campaignId));
  const snapshot = await getDocs(q);
  const list = snapshot.docs.map((d) => docToApplication(d.id, d.data() as Record<string, unknown>));
  list.sort((a, b) => applicationSortKey(b.createdAt) - applicationSortKey(a.createdAt));
  return list;
}

export async function getTeamApplicationByUid(uid: string, campaignId: string): Promise<TeamApplication | null> {
  const { getDocs, query, where } = await import('firebase/firestore');
  const q = query(
    collection(db, COLLECTION),
    where('uid', '==', uid),
    where('campaignId', '==', campaignId),
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  return docToApplication(doc.id, doc.data() as Record<string, unknown>);
}

export async function getTeamApplicationByEmail(email: string, campaignId: string): Promise<TeamApplication | null> {
  const { getDocs, query, where } = await import('firebase/firestore');
  const q = query(
    collection(db, COLLECTION),
    where('emailNormalized', '==', email.trim().toLowerCase()),
    where('campaignId', '==', campaignId),
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  return docToApplication(doc.id, doc.data() as Record<string, unknown>);
}