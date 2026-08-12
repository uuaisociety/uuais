import { collection, query, getDocs, addDoc, updateDoc, deleteDoc, onSnapshot, DocumentData, doc, Timestamp, where } from 'firebase/firestore';
import { db } from '@/lib/firebase-client';
import { ApplicationCampaign, CampaignRole } from '@/types';
import { ensureNumber, ensureString, stripUndefined } from './utils';

const COLLECTION = 'applicationCampaigns';

function ensureStringArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.map((x) => String(x));
  return [];
}

function ensureTeamInfo(v: unknown): ApplicationCampaign['teamInfo'] | undefined {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return undefined;
  const src = v as Record<string, unknown>;
  const out: Record<string, { name?: string; description?: string }> = {};
  let hasAny = false;
  Object.keys(src).forEach((k) => {
    const val = src[k];
    if (!val || typeof val !== 'object' || Array.isArray(val)) return;
    const entry = val as Record<string, unknown>;
    const name = typeof entry.name === 'string' ? entry.name : undefined;
    const description = typeof entry.description === 'string' ? entry.description : undefined;
    if (name || description) {
      out[k] = { ...(name ? { name } : {}), ...(description ? { description } : {}) };
      hasAny = true;
    }
  });
  return hasAny ? out : undefined;
}

function ensureRoles(v: unknown): CampaignRole[] {
  if (!Array.isArray(v)) return [];
  const out: CampaignRole[] = [];
  v.forEach((entry) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return;
    const e = entry as Record<string, unknown>;
    const teamId = ensureString(e.teamId);
    const title = ensureString(e.title);
    if (!teamId || !title) return;
    const status = ensureString(e.status) === 'closed' ? 'closed' : 'open';
    out.push({
      id: ensureString(e.id) || `${teamId}_${title}`,
      teamId,
      title,
      description: typeof e.description === 'string' && e.description ? e.description : undefined,
      headcount: ensureNumber(e.headcount, 0) > 0 ? ensureNumber(e.headcount, 0) : undefined,
      status,
      deadline: typeof e.deadline === 'string' && e.deadline ? e.deadline : undefined,
      order: ensureNumber(e.order, 0),
    });
  });
  return out.sort((a, b) => a.order - b.order);
}

function docToCampaign(id: string, data: Record<string, unknown>): ApplicationCampaign {
  return {
    id,
    title: ensureString(data.title),
    subtitle: ensureString(data.subtitle),
    description: ensureString(data.description),
    deadline: ensureString(data.deadline),
    status: ((): ApplicationCampaign['status'] => {
      const s = ensureString(data.status);
      if (s === 'open' || s === 'closed' || s === 'draft') return s;
      return 'draft';
    })(),
    teams: ensureStringArray(data.teams),
    roles: ensureRoles(data.roles),
    teamInfo: ensureTeamInfo(data.teamInfo),
    enabledStandardFields: ensureStringArray(data.enabledStandardFields),
    createdAt: data.createdAt as string | Timestamp | undefined,
  };
}

export type CampaignInput = Omit<ApplicationCampaign, 'id' | 'createdAt'>;

export async function getCampaigns(): Promise<ApplicationCampaign[]> {
  const snapshot = await getDocs(collection(db, COLLECTION));
  return snapshot.docs.map((d) => {
    const data = d.data() as Record<string, unknown>;
    return docToCampaign(d.id, data);
  });
}

export async function addCampaign(campaign: CampaignInput): Promise<string> {
  const payload = stripUndefined({
    title: campaign.title,
    subtitle: campaign.subtitle,
    description: campaign.description,
    deadline: campaign.deadline,
    status: campaign.status,
    teams: campaign.teams,
    roles: campaign.roles,
    teamInfo: campaign.teamInfo,
    enabledStandardFields: campaign.enabledStandardFields,
  } as Record<string, unknown>);
  const ref = await addDoc(collection(db, COLLECTION), { ...payload, createdAt: new Date().toISOString() });
  return ref.id;
}

export async function updateCampaign(id: string, campaign: Partial<ApplicationCampaign>): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id: _omit, createdAt: _omit2, ...rest } = campaign;
  const ref = doc(db, COLLECTION, id);
  await updateDoc(ref, stripUndefined(rest) as DocumentData);
}

export async function deleteCampaign(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, id));
}

export function subscribeToCampaigns(callback: (campaigns: ApplicationCampaign[]) => void, opts?: { includeAll?: boolean }) {
  // Public visitors only see open campaigns; admins pass includeAll to see drafts too
  const q = opts?.includeAll
    ? query(collection(db, COLLECTION))
    : query(collection(db, COLLECTION), where('status', '==', 'open'));
  return onSnapshot(
    q,
    (snapshot) => {
      const list = snapshot.docs.map((d) => docToCampaign(d.id, d.data() as Record<string, unknown>));
      callback(list);
    },
    (error) => {
      console.error('Firestore subscription failed:', error);
      callback([]);
    }
  );
}