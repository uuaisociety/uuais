import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  DocumentData,
} from 'firebase/firestore';
import { db } from '@/lib/firebase-client';
import { stripUndefined } from './utils';

export type UserProfile = {
  id: string;
  displayName?: string;
  name?: string;
  email?: string;
  photoURL?: string;
  isMember?: boolean;
  studentStatus?: 'student' | 'alumni' | 'other';
  campus?: 'Uppsala' | 'Gotland' | 'other';
  university?: 'Uppsala' | 'none' | 'other';
  program?: string;
  expectedGraduationYear?: number;
  gender?: string;
  linkedin?: string;
  github?: string;
  website?: string;
  bio?: string;
  heardOfUs?: string;
  newsletter?: boolean;
  lookingForJob?: boolean;
  privacyAcceptedAt?: string;
  marketingOptIn?: boolean;
  analyticsOptIn?: boolean;
  partnerContactOptIn?: boolean;
  createdAt?: string;
  updatedAt?: string;
  unsubscribedFromEmails?: boolean;
};

export const listUsers = async (): Promise<UserProfile[]> => {
  const ref = collection(db, 'users');
  const snapshot = await getDocs(ref);
  return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as DocumentData) } as UserProfile));
};

export const deleteUser = async (uid: string): Promise<void> => {
  const ref = doc(db, 'users', uid);
  await deleteDoc(ref);
};

export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  const ref = doc(db, 'users', uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Record<string, unknown>) } as UserProfile;
};

export const upsertUserProfile = async (
  uid: string,
  data: Partial<Omit<UserProfile, 'id'>>
): Promise<void> => {
  const ref = doc(db, 'users', uid);
  await setDoc(
    ref,
    {
      ...(stripUndefined(data as Record<string, unknown>) as Record<string, unknown>),
      updatedAt: new Date().toISOString(),
      createdAt: data?.createdAt ?? new Date().toISOString(),
    },
    { merge: true }
  );
};

export const updateUserProfile = async (
  uid: string,
  patch: Partial<Omit<UserProfile, 'id' | 'createdAt'>>
): Promise<void> => {
  const ref = doc(db, 'users', uid);
  await updateDoc(
    ref,
    {
      ...(stripUndefined(patch as Record<string, unknown>) as DocumentData),
      updatedAt: new Date().toISOString(),
    } as DocumentData
  );
};

export const setUserUnsubscribed = async (uid: string, unsubscribed: boolean): Promise<void> => {
  await updateUserProfile(uid, { unsubscribedFromEmails: unsubscribed });
};
