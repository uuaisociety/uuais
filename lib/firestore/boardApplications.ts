import { collection, addDoc, DocumentData } from 'firebase/firestore';
import { db } from '@/lib/firebase-client';
import { stripUndefined } from './utils';

export type BoardApplication = {
  id?: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  cv?: { path?: string; url?: string } | null;
  coverOption?: 'text' | 'file';
  coverText?: string | null;
  coverFile?: { path?: string; url?: string } | null;
  createdAt?: string;
};

export const addBoardApplication = async (app: Omit<BoardApplication, 'id' | 'createdAt'>): Promise<string> => {
  const ref = collection(db, 'boardApplications');
  const safe = stripUndefined(app as Record<string, unknown>) as DocumentData;
  const docRef = await addDoc(ref, { ...safe, createdAt: new Date().toISOString() } as DocumentData);
  return docRef.id;
};

export const listBoardApplications = async (): Promise<BoardApplication[]> => {
  const ref = collection(db, 'boardApplications');
  const snapshot = await (await import('firebase/firestore')).getDocs(ref);
  return snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as DocumentData) } as BoardApplication));
};
