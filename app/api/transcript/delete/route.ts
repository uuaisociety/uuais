import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

async function verifyAuth(req: NextRequest): Promise<{ uid: string } | null> {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    try {
        const decoded = await adminAuth.verifyIdToken(authHeader.slice('Bearer '.length));
        return decoded?.uid ? { uid: decoded.uid } : null;
    } catch {
        return null;
    }
}

/**
 * DELETE /api/transcript/delete
 *
 * One-click purge of all transcript data for the authenticated user.
 */
export async function DELETE(req: NextRequest) {
    try {
        const auth = await verifyAuth(req);
        if (!auth) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Delete all documents in the transcript_data subcollection
        const transcriptRef = adminDb
            .collection('users')
            .doc(auth.uid)
            .collection('transcript_data');

        const snapshot = await transcriptRef.get();

        if (snapshot.empty) {
            return NextResponse.json({ success: true, deleted: 0 });
        }

        const batch = adminDb.batch();
        for (const doc of snapshot.docs) {
            batch.delete(doc.ref);
        }
        await batch.commit();

        return NextResponse.json({
            success: true,
            deleted: snapshot.size,
        });
    } catch (error) {
        console.error('Transcript delete error:', error);
        return NextResponse.json(
            { error: 'Failed to delete transcript data' },
            { status: 500 }
        );
    }
}
