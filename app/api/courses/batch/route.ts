import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { fetchCourseById } from '@/lib/courses';
export const dynamic = 'force-dynamic';

/**
 * POST /api/courses/batch
 * 
 * Request body:
 * - ids: Array of course IDs to fetch
 * 
 * Returns array of courses for the provided IDs.
 * Courses that don't exist are omitted from the response.
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { ids } = body;

        if (!Array.isArray(ids)) {
            return NextResponse.json(
                { error: 'Invalid request: ids must be an array' },
                { status: 400 }
            );
        }

        if (ids.length === 0) {
            return NextResponse.json({ courses: [] });
        }

        // Limit batch size to prevent overwhelming the server
        const MAX_BATCH_SIZE = 50;
        const limitedIds = ids.slice(0, MAX_BATCH_SIZE);

        // Fetch courses in parallel
        const coursePromises = limitedIds.map(id => fetchCourseById(id));
        const courses = await Promise.all(coursePromises);

        // Filter out undefined courses (courses that don't exist)
        const validCourses = courses.filter((course): course is NonNullable<typeof course> => course !== undefined);

        return NextResponse.json({ courses: validCourses });
    } catch (error) {
        console.error('Error fetching batch courses:', error);
        return NextResponse.json(
            { error: 'Failed to fetch courses' },
            { status: 500 }
        );
    }
}
