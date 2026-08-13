import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, onSnapshot, DocumentData, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase-client';
import { CampaignQuestion } from '@/types';
import { ensureString, ensureNumber, stripUndefined } from './utils';

const COLLECTION = 'campaignQuestions';

function ensureStringArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.map((x) => String(x));
  return [];
}

function isValidType(t: unknown): t is CampaignQuestion['type'] {
  return t === 'text' || t === 'textarea' || t === 'select' || t === 'radio' || t === 'checkbox';
}

function docToQuestion(id: string, data: Record<string, unknown>): CampaignQuestion {
  const type = isValidType(data.type) ? data.type : 'text';
  return {
    id,
    campaignId: ensureString(data.campaignId),
    question: ensureString(data.question),
    type,
    options: ensureStringArray(data.options),
    required: !!data.required,
    order: ensureNumber(data.order, 0),
  };
}

export type CampaignQuestionInput = Omit<CampaignQuestion, 'id'>;

export async function getCampaignQuestions(campaignId: string): Promise<CampaignQuestion[]> {
  const q = query(collection(db, COLLECTION), where('campaignId', '==', campaignId));
  const snapshot = await getDocs(q);
  const list = snapshot.docs.map((d) => docToQuestion(d.id, d.data() as Record<string, unknown>));
  list.sort((a, b) => a.order - b.order);
  return list;
}

export async function addCampaignQuestion(q: CampaignQuestionInput): Promise<string> {
  const payload = stripUndefined({
    campaignId: q.campaignId,
    question: q.question,
    type: q.type,
    options: q.options,
    required: q.required,
    order: q.order,
  } as Record<string, unknown>);
  const ref = await addDoc(collection(db, COLLECTION), payload);
  return ref.id;
}

export async function updateCampaignQuestion(id: string, q: Partial<CampaignQuestion>): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id: _omit, campaignId: _omit2, ...rest } = q;
  const ref = doc(db, COLLECTION, id);
  await updateDoc(ref, stripUndefined(rest) as DocumentData);
}

export async function deleteCampaignQuestion(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, id));
}

export async function deleteCampaignQuestionsByCampaign(campaignId: string): Promise<void> {
  const q = query(collection(db, COLLECTION), where('campaignId', '==', campaignId));
  const snapshot = await getDocs(q);
  await Promise.all(snapshot.docs.map((d) => deleteDoc(d.ref)));
}

export function subscribeToCampaignQuestions(campaignId: string, callback: (questions: CampaignQuestion[]) => void) {
  const q = query(collection(db, COLLECTION), where('campaignId', '==', campaignId));
  return onSnapshot(
    q,
    (snapshot) => {
      const list = snapshot.docs.map((d) => docToQuestion(d.id, d.data() as Record<string, unknown>));
      list.sort((a, b) => a.order - b.order);
      callback(list);
    },
    (error) => {
      console.error('Firestore subscription failed:', error);
      callback([]);
    }
  );
}