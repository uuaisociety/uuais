import { collection, query, getDocs, addDoc, updateDoc, deleteDoc, onSnapshot, DocumentData, doc, orderBy, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase-client';
import { TeamMember } from '@/types';
import { stripUndefined } from './utils';

export const getTeamMembers = async (): Promise<TeamMember[]> => {
  const membersRef = collection(db, 'teamMembers');
  const q = query(membersRef, orderBy('order', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TeamMember));
};

export const addTeamMember = async (member: Omit<TeamMember, 'id'>): Promise<string> => {
  const membersRef = collection(db, 'teamMembers');
  const q = query(membersRef, orderBy('order', 'asc'));
  const snapshot = await getDocs(q);
  const maxOrder = snapshot.docs.length > 0 ? Math.max(...snapshot.docs.map(d => d.data().order ?? 0)) : -1;
  const payload = stripUndefined({ ...member, order: maxOrder + 1 }) as DocumentData;
  const docRef = await addDoc(membersRef, payload);
  return docRef.id;
};

export const updateTeamMember = async (id: string, member: Partial<TeamMember>): Promise<void> => {
  const memberRef = doc(db, 'teamMembers', id);
  await updateDoc(memberRef, stripUndefined(member) as DocumentData);
};

export const deleteTeamMember = async (id: string): Promise<void> => {
  const memberRef = doc(db, 'teamMembers', id);
  await deleteDoc(memberRef);
};

/** Move a team member up or down in the order */
export const moveTeamMember = async (members: TeamMember[], memberId: string, direction: 'up' | 'down'): Promise<void> => {
  const sorted = [...members].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const currentIndex = sorted.findIndex(m => m.id === memberId);
  if (currentIndex === -1) return;

  const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
  if (newIndex < 0 || newIndex >= sorted.length) return;

  const reordered = [...sorted];
  [reordered[currentIndex], reordered[newIndex]] = [reordered[newIndex], reordered[currentIndex]];

  const batch = writeBatch(db);
  reordered.forEach((member, index) => {
    const ref = doc(db, 'teamMembers', member.id);
    batch.update(ref, { order: index });
  });
  await batch.commit();
};

export const subscribeToTeamMembers = (callback: (members: TeamMember[]) => void) => {
  const membersRef = collection(db, 'teamMembers');
  const q = query(membersRef, orderBy('order', 'asc'));
  return onSnapshot(q, (snapshot) => {
    const members = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TeamMember));
    callback(members);
  });
};