import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  getDoc,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  DocumentData,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '@/lib/firebase-client';
import { ShowcaseProject } from '@/types';
import { stripUndefined } from './utils';

export const getShowcaseProjects = async (): Promise<ShowcaseProject[]> => {
  const ref = collection(db, 'showcaseProjects');
  const qy = query(ref, where('published', '==', true), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(qy);
  return snapshot.docs.map((docSnap) => ({
    ...(docSnap.data() as ShowcaseProject),
    id: docSnap.id,
  }));
};

export const getShowcaseProjectById = async (id: string): Promise<ShowcaseProject | null> => {
  const ref = doc(db, 'showcaseProjects', id);
  const snap = await getDoc(ref);
  return snap.exists() ? ({ ...(snap.data() as ShowcaseProject), id: snap.id } as ShowcaseProject) : null;
};

export const addShowcaseProject = async (project: Omit<ShowcaseProject, 'id'>): Promise<string> => {
  const ref = collection(db, 'showcaseProjects');
  const docRef = await addDoc(ref, stripUndefined(project) as DocumentData);
  return docRef.id;
};

export const updateShowcaseProject = async (id: string, patch: Partial<ShowcaseProject>): Promise<void> => {
  const ref = doc(db, 'showcaseProjects', id);
  const safePatch = stripUndefined(patch) as DocumentData;
  await updateDoc(ref, safePatch);
};

export const deleteShowcaseProject = async (id: string): Promise<void> => {
  const ref = doc(db, 'showcaseProjects', id);
  await deleteDoc(ref);
};

export const subscribeToShowcaseProjects = (
  callback: (projects: ShowcaseProject[]) => void,
  options?: { includeUnpublished?: boolean },
) => {
  const ref = collection(db, 'showcaseProjects');
  const qy = options && options.includeUnpublished
    ? query(ref, orderBy('createdAt', 'desc'))
    : query(ref, where('published', '==', true), orderBy('createdAt', 'desc'));

  return onSnapshot(qy, (snapshot) => {
    const projects = snapshot.docs.map((docSnap) => ({
      ...(docSnap.data() as ShowcaseProject),
      id: docSnap.id,
    }));
    callback(projects);
  });
};
