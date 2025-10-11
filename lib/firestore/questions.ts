import {
  collection,
  query,
  orderBy,
  onSnapshot,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  where,
} from 'firebase/firestore';
import { db } from '@/lib/firebase-client';
import type { DocumentData } from 'firebase/firestore';
import { RegistrationQuestion, EventCustomQuestion } from '@/types';
import { stripUndefined } from './utils';

// Global Registration Questions
export const getRegistrationQuestions = async (): Promise<RegistrationQuestion[]> => {
  const rqRef = collection(db, 'registrationQuestions');
  const snapshot = await getDocs(rqRef);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RegistrationQuestion));
};

export const addRegistrationQuestion = async (rq: Omit<RegistrationQuestion, 'id'>): Promise<string> => {
  const rqRef = collection(db, 'registrationQuestions');
  const docRef = await addDoc(rqRef, rq);
  return docRef.id;
};

export const updateRegistrationQuestion = async (id: string, rq: Partial<RegistrationQuestion>): Promise<void> => {
  const docRef = (await import('firebase/firestore')).doc(db, 'registrationQuestions', id);
  await updateDoc(docRef, stripUndefined(rq) as DocumentData);
};

export const deleteRegistrationQuestion = async (id: string): Promise<void> => {
  const rqDoc = (await import('firebase/firestore')).doc(db, 'registrationQuestions', id);
  await deleteDoc(rqDoc);
};

export const subscribeToRegistrationQuestions = (callback: (qs: RegistrationQuestion[]) => void) => {
  const rqRef = collection(db, 'registrationQuestions');
  return onSnapshot(rqRef, (snapshot) => {
    const questions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RegistrationQuestion));
    callback(questions);
  });
};

// Event-specific Custom Questions
export const getEventCustomQuestions = async (eventId: string): Promise<EventCustomQuestion[]> => {
  const cqRef = collection(db, 'eventCustomQuestions');
  const qy = query(cqRef, where('eventId', '==', eventId), orderBy('order', 'asc'));
  const snapshot = await getDocs(qy);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as EventCustomQuestion));
};

export const subscribeToEventCustomQuestions = (
  eventId: string,
  callback: (qs: EventCustomQuestion[]) => void
) => {
  const cqRef = collection(db, 'eventCustomQuestions');
  const qy = query(cqRef, where('eventId', '==', eventId), orderBy('order', 'asc'));
  return onSnapshot(qy, (snapshot) => {
    const qs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as EventCustomQuestion));
    callback(qs);
  });
};

export const addEventCustomQuestion = async (
  question: Omit<EventCustomQuestion, 'id'>
): Promise<string> => {
  const cqRef = collection(db, 'eventCustomQuestions');
  const docRef = await addDoc(cqRef, question);
  return docRef.id;
};

export const updateEventCustomQuestion = async (
  id: string,
  patch: Partial<EventCustomQuestion>
): Promise<void> => {
  const cqDoc = (await import('firebase/firestore')).doc(db, 'eventCustomQuestions', id);
  await updateDoc(cqDoc, stripUndefined(patch) as DocumentData);
};

export const deleteEventCustomQuestion = async (id: string): Promise<void> => {
  const cqDoc = (await import('firebase/firestore')).doc(db, 'eventCustomQuestions', id);
  await deleteDoc(cqDoc);
};
