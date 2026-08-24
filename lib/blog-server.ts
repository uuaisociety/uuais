import { adminDb } from '@/lib/firebase-admin';
import type { BlogPost } from '@/types';

/** Look up a published post by slug (preferred) or Firestore id. Returns null on miss or unpublished. */
export async function findPublishedBlogPost(idOrSlug: string): Promise<BlogPost | null> {
  try {
    const bySlug = await adminDb.collection('blogPosts').where('slug', '==', idOrSlug).limit(1).get();
    if (!bySlug.empty) {
      const doc = bySlug.docs[0];
      const data = doc.data();
      if (data?.published === true) return { id: doc.id, ...data } as unknown as BlogPost;
    }
    const byId = await adminDb.collection('blogPosts').doc(idOrSlug).get();
    if (byId.exists) {
      const data = byId.data();
      if (data?.published === true) return { id: byId.id, ...data } as unknown as BlogPost;
    }
    return null;
  } catch (e) {
    console.warn('findPublishedBlogPost failed:', e);
    return null;
  }
}

/** All published posts, newest first (used for sitemap + metadata). */
export async function getPublishedBlogPosts(): Promise<BlogPost[]> {
  try {
    const snapshot = await adminDb.collection('blogPosts').where('published', '==', true).get();
    return snapshot.docs
      .map((d) => ({ id: d.id, ...d.data() } as unknown as BlogPost))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  } catch (e) {
    console.warn('getPublishedBlogPosts failed:', e);
    return [];
  }
}
