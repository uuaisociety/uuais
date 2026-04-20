import { collection, query, getDocs, addDoc, updateDoc, deleteDoc, onSnapshot, DocumentData, doc, orderBy, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase-client';
import { BoardPosition } from '@/types';
import { ensureString, stripUndefined, ensureNumber } from './utils';

/** Firestore doc id is authoritative; ignore any legacy `id` field stored in document data. */
function docToBoardPosition(docSnap: { id: string; data: () => Record<string, unknown> }, index?: number): BoardPosition {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    title: ensureString(data.title),
    short: ensureString(data.short),
    description: ensureString(data.description),
    order: ensureNumber(data.order, index ?? 0),
  };
}

export const getPositions = async (): Promise<BoardPosition[]> => {
  const positionsRef = collection(db, 'board-positions');
  const q = query(positionsRef, orderBy('order', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d, i) => docToBoardPosition(d, i));
};

export const addPosition = async (position: Omit<BoardPosition, 'id' | 'order'>): Promise<string> => {
  // Get current max order to place new position at the end
  const positions = await getPositions();
  const maxOrder = positions.length > 0 ? Math.max(...positions.map(p => p.order)) : -1;
  const newOrder = maxOrder + 1;

  const boardPositionsRef = collection(db, 'board-positions');
  const payload = stripUndefined({
    title: position.title,
    short: position.short,
    description: position.description,
    order: newOrder,
  });
  const docRef = await addDoc(boardPositionsRef, payload);
  return docRef.id;
};

export const updatePosition = async (id: string, position: Partial<BoardPosition>): Promise<void> => {
  const positionRef = doc(db, 'board-positions', id);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id: _omit, ...rest } = position;
  await updateDoc(positionRef, stripUndefined(rest) as DocumentData);
};

/** Move a position up or down in the order */
export const movePosition = async (positions: BoardPosition[], positionId: string, direction: 'up' | 'down'): Promise<void> => {
  const currentIndex = positions.findIndex(p => p.id === positionId);
  if (currentIndex === -1) return;

  const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
  if (newIndex < 0 || newIndex >= positions.length) return;

  // Swap the positions in the array
  const newPositions = [...positions];
  [newPositions[currentIndex], newPositions[newIndex]] = [newPositions[newIndex], newPositions[currentIndex]];

  // Update order values to match new indices
  await reorderPositions(newPositions);
};

export const deletePosition = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, 'board-positions', id));
};

export const subscribeToPositions = (callback: (positions: BoardPosition[]) => void) => {
  const boardPositionsRef = collection(db, 'board-positions');
  const q = query(boardPositionsRef, orderBy('order', 'asc'));
  return onSnapshot(q, (snapshot) => {
    const list = snapshot.docs.map((d, i) => docToBoardPosition(d, i));
    callback(list);
  });
};

/** Reorder positions by swapping the order values of two positions */
export const reorderPositions = async (positions: BoardPosition[]): Promise<void> => {
  const batch = writeBatch(db);
  positions.forEach((position, index) => {
    const ref = doc(db, 'board-positions', position.id);
    batch.update(ref, { order: index });
  });
  await batch.commit();
};