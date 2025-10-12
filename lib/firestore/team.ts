import { collection, getDocs, addDoc, updateDoc, deleteDoc, onSnapshot, DocumentData } from 'firebase/firestore';
import { db } from '@/lib/firebase-client';
import { TeamMember } from '@/types';
import { stripUndefined } from './utils';

export const getTeamMembers = async (): Promise<TeamMember[]> => {
  const membersRef = collection(db, 'teamMembers');
  const snapshot = await getDocs(membersRef);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TeamMember));
};

export const addTeamMember = async (member: Omit<TeamMember, 'id'>): Promise<string> => {
  const membersRef = collection(db, 'teamMembers');
  const docRef = await addDoc(membersRef, member);
  return docRef.id;
};

export const updateTeamMember = async (id: string, member: Partial<TeamMember>): Promise<void> => {
  const memberRef = (await import('firebase/firestore')).doc(db, 'teamMembers', id);
  await updateDoc(memberRef, stripUndefined(member) as DocumentData);
};

export const deleteTeamMember = async (id: string): Promise<void> => {
  const memberRef = (await import('firebase/firestore')).doc(db, 'teamMembers', id);
  await deleteDoc(memberRef);
};

export const subscribeToTeamMembers = (callback: (members: TeamMember[]) => void) => {
  const membersRef = collection(db, 'teamMembers');
  return onSnapshot(membersRef, (snapshot) => {
    const members = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TeamMember));
    callback(members);
  });
};
