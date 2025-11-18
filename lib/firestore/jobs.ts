import { collection, query, orderBy, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, DocumentData, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase-client';
import { Job } from '@/types';
import { stripUndefined } from './utils';


// Jobs
export const getJobs = async (): Promise<Job[]> => {
  const jobsRef = collection(db, 'jobs');
  const qy = query(jobsRef, orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(qy);
  return snapshot.docs.map((d) => {
    const data = d.data() as DocumentData;
    const ts = data?.createdAt;
    const createdAt = ts instanceof Timestamp ? ts.toDate().toISOString() : undefined;
    return { id: d.id, ...data, createdAt } as Job;
  });
};

export const addJob = async (job: Omit<Job, 'id' | 'createdAt'> & { createdAt?: never }): Promise<string> => {
  const jobsRef = collection(db, 'jobs');
  const payload = stripUndefined({ ...job, createdAt: serverTimestamp() }) as DocumentData;
  const docRef = await addDoc(jobsRef, payload);
  return docRef.id;
};

export const updateJob = async (id: string, patch: Partial<Job>): Promise<void> => {
  const jobRef = doc(db, 'jobs', id);
  const safe = stripUndefined(patch) as DocumentData;
  await updateDoc(jobRef, safe);
};

export const deleteJob = async (id: string): Promise<void> => {
  const jobRef = doc(db, 'jobs', id);
  await deleteDoc(jobRef);
};

export const subscribeToJobs = (callback: (jobs: Job[]) => void) => {
  const jobsRef = collection(db, 'jobs');
  const qy = query(jobsRef, orderBy('createdAt', 'desc'));
  return onSnapshot(qy, (snapshot) => {
    const jobs = snapshot.docs.map((d) => {
      const data = d.data() as DocumentData;
      const ts = data?.createdAt;
      const createdAt = ts instanceof Timestamp ? ts.toDate().toISOString() : undefined;
      return { id: d.id, ...data, createdAt } as Job;
    });
    callback(jobs);
  });
};