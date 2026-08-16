import { adminDb } from '@/lib/firebase-admin';

interface EngagementRow {
  title: string;
  date: string;
  reads: number;
  likes: number;
  dislikes: number;
  shares: number;
}

/** Gather reads/likes/dislikes/shares for the newest AI News Desk posts as prompt feedback (best-effort). */
export async function fetchEngagementFeedback(limit = 6): Promise<string> {
  try {
    const snapshot = await adminDb
      .collection('blogPosts')
      .where('authorType', '==', 'ai')
      .orderBy('date', 'desc')
      .limit(limit)
      .get();
    const posts = snapshot.docs.map((d) => ({ id: d.id, title: d.data().title || 'Untitled', date: d.data().date || '' }));

    if (posts.length === 0) return '(no published AI News Desk posts yet — no engagement data)';

    const rows: EngagementRow[] = await Promise.all(
      posts.map(async (post) => {
        const [readsSnap, reactionsSnap] = await Promise.all([
          adminDb.collection('analyticsBlogs').doc(post.id).get(),
          adminDb.collection('blogReactions').doc(post.id).get(),
        ]);
        const reads = readsSnap.exists ? (readsSnap.data()?.reads ?? 0) : 0;
        const r = reactionsSnap.exists ? reactionsSnap.data() : {};
        return {
          title: post.title,
          date: post.date,
          reads: typeof reads === 'number' ? reads : 0,
          likes: typeof r?.likes === 'number' ? r.likes : 0,
          dislikes: typeof r?.dislikes === 'number' ? r.dislikes : 0,
          shares: typeof r?.shares === 'number' ? r.shares : 0,
        };
      })
    );

    return rows
      .map(
        (row, i) =>
          `${i + 1}. "${row.title}" (${row.date || 'unknown date'}) — reads ${row.reads}, likes ${row.likes}, dislikes ${row.dislikes}, shares ${row.shares}`
      )
      .join('\n');
  } catch (e) {
    console.warn('Failed to fetch engagement feedback:', e);
    return '(engagement data unavailable)';
  }
}
