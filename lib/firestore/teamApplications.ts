import { collection, onSnapshot, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase-client';
import { TeamApplication } from '@/types';
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

function docToApplication(id: string, data: Record<string, unknown>): TeamApplication {
  return {
    id,
    campaignId: ensureString(data.campaignId),
    name: ensureString(data.name),
    email: ensureString(data.email),
    emailNormalized: ensureString(data.emailNormalized) || undefined,
    gender: typeof data.gender === 'string' ? data.gender : undefined,
    university: typeof data.university === 'string' ? data.university : undefined,
    program: typeof data.program === 'string' ? data.program : undefined,
    graduationYear: typeof data.graduationYear === 'string' ? data.graduationYear : undefined,
    linkedin: typeof data.linkedin === 'string' ? data.linkedin : undefined,
    resume: typeof data.resume === 'object' ? (data.resume as { path?: string; url?: string } | null) : null,
    interests: ensureStringArray(data.interests),
    teamRanking: ensureStringArray(data.teamRanking),
    customTeam: typeof data.customTeam === 'string' ? data.customTeam : undefined,
    weeklyHours: typeof data.weeklyHours === 'number' ? data.weeklyHours : ensureNumber(data.weeklyHours, 0),
    motivation: typeof data.motivation === 'string' ? data.motivation : undefined,
    customAnswers: ensureStringRecord(data.customAnswers),
    agree: typeof data.agree === 'boolean' ? data.agree : undefined,
    newsletter: typeof data.newsletter === 'boolean' ? data.newsletter : undefined,
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

/**
 * Delete an application together with its campaign lock and cooldown limit docs.
 * Call this instead of deleteTeamApplication when the admin deletes a submission.
 */
export async function deleteTeamApplicationWithLimits(
  id: string,
  emailNormalized: string,
  campaignId: string,
): Promise<void> {
  const { deleteDoc: del, doc: d } = await import('firebase/firestore');
  const sanitize = (s: string) => encodeURIComponent(s);
  const lockKey = `${sanitize(emailNormalized)}__${sanitize(campaignId)}`;
  await Promise.all([
    deleteDoc(doc(db, COLLECTION, id)),
    del(d(db, 'applicationCampaignLocks', lockKey)),
    del(d(db, 'applicationUserLimits', sanitize(emailNormalized))),
  ]);
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