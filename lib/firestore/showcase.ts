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

/** A free slug (`-2`, `-3`…): lookups take the first match, so a duplicate leaves one project unreachable. Admin-only read. */
export const ensureUniqueShowcaseSlug = async (
  base: string,
  excludeId?: string,
): Promise<string> => {
  const ref = collection(db, 'showcaseProjects');
  for (let n = 1; n < 100; n += 1) {
    const candidate = n === 1 ? base : `${base}-${n}`;
    const snapshot = await getDocs(query(ref, where('slug', '==', candidate)));
    if (snapshot.docs.every((docSnap) => docSnap.id === excludeId)) return candidate;
  }
  // 99 projects sharing a title is not a real case; fall back to the unique id.
  return excludeId ? `${base}-${excludeId}` : base;
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

/** `fromCache` means the server was never reached: an empty result then means "could not ask", not "none". */
export type ShowcaseSnapshotMeta = { fromCache: boolean };

export const subscribeToShowcaseProjects = (
  callback: (projects: ShowcaseProject[], meta: ShowcaseSnapshotMeta) => void,
  options?: { includeUnpublished?: boolean; onError?: (error: Error) => void },
) => {
  const ref = collection(db, 'showcaseProjects');
  const qy = options && options.includeUnpublished
    ? query(ref, orderBy('createdAt', 'desc'))
    : query(ref, where('published', '==', true), orderBy('createdAt', 'desc'));

  return onSnapshot(
    qy,
    (snapshot) => {
      const projects = snapshot.docs.map((docSnap) => ({
        ...(docSnap.data() as ShowcaseProject),
        id: docSnap.id,
      }));
      callback(projects, { fromCache: snapshot.metadata.fromCache });
    },
    (error) => {
      // A dropped stream is silent otherwise: the last snapshot just stops updating.
      console.warn('showcase subscription error:', error);
      options?.onError?.(error);
    },
  );
};

/** A member's own submissions, so review is not a void. The creator filter mirrors the rule that permits it. */
export const subscribeToMyShowcaseProjects = (
  userId: string,
  callback: (projects: ShowcaseProject[]) => void,
) => {
  const ref = collection(db, 'showcaseProjects');
  const qy = query(ref, where('creatorUserId', '==', userId));
  return onSnapshot(qy, (snapshot) => {
    callback(
      snapshot.docs.map((docSnap) => ({
        ...(docSnap.data() as ShowcaseProject),
        id: docSnap.id,
      })),
    );
  });
};

/** Tell the builder their project went live. Best-effort: a mail failure must never block the publish. */
export const notifyShowcaseApproved = async (
  project: ShowcaseProject,
  baseUrl?: string,
): Promise<void> => {
  try {
    const { getUserProfile } = await import('@/lib/firestore/users');
    const profile = await getUserProfile(project.creatorUserId);
    if (!profile?.email || profile.unsubscribedFromEmails) return;

    const origin = baseUrl || (typeof window !== 'undefined' ? window.location.origin : '');
    const { sendTemplatedEmail } = await import('@/lib/email');
    await sendTemplatedEmail({
      to: profile.email,
      subject: `${project.title} is live on the showcase`,
      templatePath: '/email-templates/showcaseApproved.html',
      variables: {
        name: profile.displayName || profile.name || project.creatorName || 'there',
        project_title: project.title,
        project_url: `${origin}/showcase/${project.slug || project.id}`,
      },
    });
  } catch (e) {
    console.warn('Failed to send showcase approval email:', e);
  }
};
