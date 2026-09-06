import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requireAdmin, authFailureResponse } from '@/lib/server-auth';
import { getProgram, getProgramIndex, programSlug } from '@/lib/programs';

/** GET /api/admin/programs — ingestion counts read from the on-disk plan files. */
export async function GET(req: NextRequest) {
    try {
        const auth = await requireAdmin(req);
        if (!auth.ok) {
            return authFailureResponse(auth.reason);
        }

        const index = getProgramIndex();
        const programmes = index.programmes.map((entry) => {
            const program = getProgram(programSlug(entry));
            return {
                ...entry,
                edges: program?.edges.length ?? 0,
                rules: program?.rules.length ?? 0,
                reviewed: program?.reviewed ?? false,
            };
        });

        return NextResponse.json({
            faculties: index.faculties,
            scrapedAt: index.scrapedAt,
            programmes,
        });
    } catch (error) {
        console.error('Programme status error:', error);
        return NextResponse.json({ error: 'Failed to read programmes' }, { status: 500 });
    }
}
