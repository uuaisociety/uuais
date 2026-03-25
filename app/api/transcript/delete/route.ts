import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getTokens } from 'next-firebase-auth-edge';
import { authConfig } from '@/lib/auth-config';

/**
 * DELETE /api/transcript/delete
 *
 * One-click purge of all transcript data for the authenticated user.
 * Note: Client should use Firebase client SDK to delete data.
 * This endpoint only provides the user ID for the client to use.
 */
export async function DELETE(req: NextRequest) {
    try {
        // Verify Firebase auth using next-firebase-auth-edge
        const tokens = await getTokens(req.cookies, authConfig);
        if (!tokens) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const uid = tokens.decodedToken.uid;

        // Client should handle deletion using Firebase client SDK
        // Firebase Security Rules will enforce authentication
        return NextResponse.json({
            success: true,
            message: 'Use Firebase client SDK to delete transcript data',
            uid: uid,
        });
    } catch (error) {
        console.error('Transcript delete error:', error);
        return NextResponse.json(
            { error: 'Failed to delete transcript data' },
            { status: 500 }
        );
    }
}
