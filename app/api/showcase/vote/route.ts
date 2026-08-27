import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import '@/lib/firebase-admin';
import admin from 'firebase-admin';
import { authorizeMember } from '@/lib/member-auth';
import { checkShowcaseRateLimit } from '@/lib/showcase-rate-limit';

class VoteError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

// Firestore doc ids cannot contain '/' or control chars; cap length to keep the vote doc path `showcaseVotes/${projectId}_${uid}` well-formed.
function isValidProjectId(id: unknown): id is string {
  if (typeof id !== 'string' || id.length === 0 || id.length > 128) return false;
  for (let i = 0; i < id.length; i++) {
    const code = id.charCodeAt(i);
    if (code === 0x2f || code <= 0x1f || code === 0x7f) return false;
  }
  return true;
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authorizeMember(req);
    if (!auth.ok) return NextResponse.json({ error: 'unauthorized', reason: auth.reason }, { status: 401 });
    const uid = auth.uid;

    const body = await req.json();
    const { projectId } = body as { projectId?: string };
    if (!isValidProjectId(projectId)) {
      return NextResponse.json({ error: 'invalid projectId' }, { status: 400 });
    }

    const rate = await checkShowcaseRateLimit(uid, 'vote', 60, 1);
    if (!rate.allowed) {
      return NextResponse.json({ error: 'rate-limit', retryAfterSeconds: rate.retryAfterSeconds }, { status: 429 });
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
        const projectData = projectSnap.exists ? projectSnap.data() : null;
        if (!projectData || projectData.published !== true) {
          throw new VoteError('not-found', 404);
        }
        if (projectData.creatorUserId === uid) {
          throw new VoteError('cannot-vote-own', 403);
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

/** Withdraw a vote. A vote you cannot take back is a trap, not an endorsement. */
export async function DELETE(req: NextRequest) {
  try {
    const auth = await authorizeMember(req);
    if (!auth.ok) return NextResponse.json({ error: 'unauthorized', reason: auth.reason }, { status: 401 });
    const uid = auth.uid;

    const body = await req.json();
    const { projectId } = body as { projectId?: string };
    if (!isValidProjectId(projectId)) {
      return NextResponse.json({ error: 'invalid projectId' }, { status: 400 });
    }

    const rate = await checkShowcaseRateLimit(uid, 'vote', 60, 1);
    if (!rate.allowed) {
      return NextResponse.json({ error: 'rate-limit', retryAfterSeconds: rate.retryAfterSeconds }, { status: 429 });
    }

    const db = admin.firestore();
    const voteRef = db.doc(`showcaseVotes/${projectId}_${uid}`);
    const projectRef = db.doc(`showcaseProjects/${projectId}`);

    try {
      await db.runTransaction(async (tx) => {
        const voteSnap = await tx.get(voteRef);
        // 409 rather than 200: the client uses it to resync a stale local vote state, which a silent success would leave wrong.
        if (!voteSnap.exists) throw new VoteError('not-voted', 409);

        const projectSnap = await tx.get(projectRef);
        if (!projectSnap.exists) throw new VoteError('not-found', 404);

        tx.delete(voteRef);
        // Guard the floor so a stale counter can never go negative.
        const current = projectSnap.data()?.votes;
        const next = typeof current === 'number' ? Math.max(0, current - 1) : 0;
        tx.update(projectRef, { votes: next });
      });
    } catch (err) {
      if (err instanceof VoteError) {
        return NextResponse.json({ error: err.message }, { status: err.status });
      }
      throw err;
    }

    const after = await projectRef.get();
    const votesAfter = after.data()?.votes;

    return NextResponse.json({ ok: true, votes: typeof votesAfter === 'number' ? votesAfter : 0 });
  } catch (err) {
    console.error('showcase unvote error', err);
    return NextResponse.json({ error: 'failed to remove vote' }, { status: 500 });
  }
}
