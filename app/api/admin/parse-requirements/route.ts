import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { fetchCourses } from '@/lib/courses';
import { parseRequirements } from '@/lib/prerequisites/parser';

async function authorizeAdmin(req: NextRequest): Promise<{ ok: true; uid: string } | { ok: false }> {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) return { ok: false };

    const idToken = authHeader.slice('Bearer '.length);
    try {
        const decoded = await adminAuth.verifyIdToken(idToken);
        if (decoded?.uid && (decoded.admin === true || decoded.superAdmin === true)) {
            return { ok: true, uid: decoded.uid };
        }
        return { ok: false };
    } catch {
        return { ok: false };
    }
}

/**
 * POST /api/admin/parse-requirements
 *
 * Body: { courseId: string } or { courseId: "all" }
 *
 * Parses entry_requirements from the course document(s) into structured requirements
 * and writes them back to Firestore.
 */
export async function POST(req: NextRequest) {
    try {
        const auth = await authorizeAdmin(req);
        if (!auth.ok) {
            return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { courseId } = body;

        if (!courseId) {
            return NextResponse.json({ error: 'courseId required' }, { status: 400 });
        }

        const allCourses = await fetchCourses();
        const knownCourses = allCourses.map(c => ({ code: c.code, title: c.title, id: c.id }));

        if (courseId === 'all') {
            // Batch parse all courses
            let parsed = 0;
            let skipped = 0;
            let failed = 0;
            const errors: string[] = [];

            for (const course of allCourses) {
                const entryReq = course.entry_requirements || course.generalRequirements?.[0];
                if (!entryReq || entryReq.trim().length === 0) {
                    skipped++;
                    continue;
                }

                try {
                    const structured = await parseRequirements(entryReq, knownCourses);
                    await adminDb.collection('courses').doc(course.id).update({
                        structured_requirements: structured,
                    });
                    parsed++;
                } catch (error) {
                    failed++;
                    errors.push(`${course.id}: ${error instanceof Error ? error.message : 'unknown error'}`);
                }
            }

            return NextResponse.json({
                success: true,
                parsed,
                skipped,
                failed,
                total: allCourses.length,
                errors: errors.slice(0, 10),
            });
        } else {
            // Parse single course
            const course = allCourses.find(c => c.id === courseId);
            if (!course) {
                return NextResponse.json({ error: 'course not found' }, { status: 404 });
            }

            const entryReq = course.entry_requirements || course.generalRequirements?.[0];
            if (!entryReq || entryReq.trim().length === 0) {
                return NextResponse.json({ error: 'course has no entry requirements to parse' }, { status: 400 });
            }

            const structured = await parseRequirements(entryReq, knownCourses);
            await adminDb.collection('courses').doc(course.id).update({
                structured_requirements: structured,
            });

            return NextResponse.json({
                success: true,
                courseId,
                structured_requirements: structured,
            });
        }
    } catch (error) {
        console.error('Parse requirements error:', error);
        return NextResponse.json(
            { error: 'internal error', message: error instanceof Error ? error.message : 'unknown' },
            { status: 500 }
        );
    }
}
