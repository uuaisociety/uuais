import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import '@/lib/firebase-admin';
import admin from 'firebase-admin';
import { authorizeMember } from '@/lib/member-auth';

class VoteError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authorizeMember(req);
    if (!auth.ok) return NextResponse.json({ error: 'unauthorized', reason: auth.reason }, { status: 401 });
    const uid = auth.uid;

    const body = await req.json();
    const { projectId } = body as { projectId?: string };
    if (!projectId || typeof projectId !== 'string') {
      return NextResponse.json({ error: 'missing projectId' }, { status: 400 });
    }

    const db = admin.firestore();
    const voteRef = db.doc(`showcaseVotes/${projectId}_${uid}`);
    const projectRef = db.doc(`showcaseProjects/${projectId}`);

    let votes = 0;
    try {
      await db.runTransaction(async (tx) => {
        const voteSnap = await tx.get(voteRef);
        if (voteSnap.exists) throw new VoteError('already-voted', 409);

        const projectSnap = await tx.get(projectRef);
        if (!projectSnap.exists || projectSnap.data()?.published !== true) {
          throw new VoteError('not-found', 404);
        }

        tx.set(voteRef, {
          projectId,
          userId: uid,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        tx.update(projectRef, { votes: admin.firestore.FieldValue.increment(1) });
      });
    } catch (err) {
      if (err instanceof VoteError) {
        return NextResponse.json({ error: err.message }, { status: err.status });
      }
      throw err;
    }

    const after = await projectRef.get();
    const votesAfter = after.data()?.votes;
    votes = typeof votesAfter === 'number' ? votesAfter : 0;

    return NextResponse.json({ ok: true, votes });
  } catch (err) {
    console.error('showcase vote error', err);
    return NextResponse.json({ error: 'failed to vote' }, { status: 500 });
  }
}
