import { collection, query, getDocs, addDoc, updateDoc, deleteDoc, onSnapshot, DocumentData, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase-client';
import { BoardPosition } from '@/types';
import { ensureString, stripUndefined } from './utils';

/** Firestore doc id is authoritative; ignore any legacy `id` field stored in document data. */
function docToBoardPosition(docSnap: { id: string; data: () => Record<string, unknown> }): BoardPosition {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    title: ensureString(data.title),
    short: ensureString(data.short),
    description: ensureString(data.description),
  };
}

export const getPositions = async (): Promise<BoardPosition[]> => {
  const positionsRef = collection(db, 'board-positions');
  const q = query(positionsRef);
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => docToBoardPosition(d));
};

export const addPosition = async (position: Omit<BoardPosition, 'id'>): Promise<string> => {
  const boardPositionsRef = collection(db, 'board-positions');
  const payload = stripUndefined({
    title: position.title,
    short: position.short,
    description: position.description,
  });
  const docRef = await addDoc(boardPositionsRef, payload);
  return docRef.id;
};

export const updatePosition = async (id: string, position: Partial<BoardPosition>): Promise<void> => {
  const positionRef = doc(db, 'board-positions', id);
  const { id: _omit, ...rest } = position;
  await updateDoc(positionRef, stripUndefined(rest) as DocumentData);
};

export const deletePosition = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, 'board-positions', id));
};

export const subscribeToPositions = (callback: (positions: BoardPosition[]) => void) => {
  const boardPositionsRef = collection(db, 'board-positions');
  const q = query(boardPositionsRef);
  return onSnapshot(q, (snapshot) => {
    const list = snapshot.docs.map((d) => docToBoardPosition(d));
    callback(list);
  });
};