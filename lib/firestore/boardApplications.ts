import { collection, addDoc, deleteDoc, doc, onSnapshot, DocumentData, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase-client';
import { stripUndefined } from './utils';

export type BoardApplication = {
  id?: string;
  name: string;
  email: string;
  emailNormalized?: string;
  phone?: string;
  role: string;
  roleId?: string;
  cv?: { path?: string; url?: string } | null;
  coverOption?: 'text' | 'file';
  coverText?: string | null;
  coverFile?: { path?: string; url?: string } | null;
  createdAt?: string | Timestamp;
};

function applicationSortKey(createdAt: BoardApplication['createdAt']): number {
  if (!createdAt) return 0;
  if (typeof createdAt === 'string') return new Date(createdAt).getTime();
  if (createdAt instanceof Timestamp) return createdAt.toMillis();
  return 0;
}

export const addBoardApplication = async (app: Omit<BoardApplication, 'id' | 'createdAt'>): Promise<string> => {
  const ref = collection(db, 'boardApplications');
  const safe = stripUndefined(app as Record<string, unknown>) as DocumentData;
  if (typeof safe.email === 'string' && !safe.emailNormalized) {
    safe.emailNormalized = safe.email.trim().toLowerCase();
  }
  const docRef = await addDoc(ref, { ...safe, createdAt: new Date().toISOString() } as DocumentData);
  return docRef.id;
};

export const listBoardApplications = async (): Promise<BoardApplication[]> => {
  const ref = collection(db, 'boardApplications');
  const snapshot = await (await import('firebase/firestore')).getDocs(ref);
  return snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as DocumentData) } as BoardApplication));
};

export const deleteBoardApplication = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, 'boardApplications', id));
};

export const subscribeToBoardApplications = (callback: (applications: BoardApplication[]) => void) => {
  const ref = collection(db, 'boardApplications');
  return onSnapshot(ref, (snapshot) => {
    const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as BoardApplication));
    list.sort((a, b) => applicationSortKey(b.createdAt) - applicationSortKey(a.createdAt));
    callback(list);
  });
};
