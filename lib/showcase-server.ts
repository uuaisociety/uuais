import { adminDb } from '@/lib/firebase-admin';
import type { ShowcaseProject } from '@/types';

/** Look up a published project by slug (preferred) or Firestore id. Returns null on miss or unpublished. */
export async function findPublishedShowcaseProject(idOrSlug: string): Promise<ShowcaseProject | null> {
  try {
    const bySlug = await adminDb.collection('showcaseProjects').where('slug', '==', idOrSlug).limit(1).get();
    if (!bySlug.empty) {
      const doc = bySlug.docs[0];
      const data = doc.data();
      if (data?.published === true) return { id: doc.id, ...data } as unknown as ShowcaseProject;
    }
    const byId = await adminDb.collection('showcaseProjects').doc(idOrSlug).get();
    if (byId.exists) {
      const data = byId.data();
      if (data?.published === true) return { id: byId.id, ...data } as unknown as ShowcaseProject;
    }
    return null;
  } catch (e) {
    console.warn('findPublishedShowcaseProject failed:', e);
    return null;
  }
}

/** All published projects, newest first (used for the sitemap). */
export async function getPublishedShowcaseProjects(): Promise<ShowcaseProject[]> {
  try {
    const snapshot = await adminDb.collection('showcaseProjects').where('published', '==', true).get();
    return snapshot.docs
      .map((d) => ({ id: d.id, ...d.data() } as unknown as ShowcaseProject))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (e) {
    console.warn('getPublishedShowcaseProjects failed:', e);
    return [];
  }
}
