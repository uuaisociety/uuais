import { collection, query, orderBy, getDocs, addDoc, updateDoc, deleteDoc, onSnapshot, DocumentData } from 'firebase/firestore';
import { db } from '@/lib/firebase-client';
import { FAQ } from '@/types';
import { stripUndefined } from './utils';

export const getFaqs = async (): Promise<FAQ[]> => {
  const faqsRef = collection(db, 'faqs');
  const q = query(faqsRef, orderBy('order', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FAQ));
};

export const addFaq = async (faq: Omit<FAQ, 'id'>): Promise<string> => {
  const faqsRef = collection(db, 'faqs');
  const docRef = await addDoc(faqsRef, faq);
  return docRef.id;
};

export const updateFaq = async (id: string, faq: Partial<FAQ>): Promise<void> => {
  const faqRef = (await import('firebase/firestore')).doc(db, 'faqs', id);
  await updateDoc(faqRef, stripUndefined(faq) as DocumentData);
};

export const deleteFaq = async (id: string): Promise<void> => {
  const faqRef = (await import('firebase/firestore')).doc(db, 'faqs', id);
  await deleteDoc(faqRef);
};

export const subscribeToFaqs = (callback: (faqs: FAQ[]) => void) => {
  const faqsRef = collection(db, 'faqs');
  const q = query(faqsRef, orderBy('order', 'asc'));
  return onSnapshot(q, (snapshot) => {
    const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FAQ));
    callback(list);
  });
};
