import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { fetchCourses } from '@/lib/courses';
import { authorizeAdmin } from '@/app/api/admin/AuthorizeAPI';
export const dynamic = 'force-dynamic';

const MAX_PAGE_SIZE = 50;
const DEFAULT_PAGE_SIZE = 50;



/**
 * GET /api/courses
 * 
 * Query parameters:
 * - page: Page number (1-based, default: 1)
 * - limit: Items per page (max 50, default: 50)
 * - search: Optional search query (filters server-side)
 * - level: Optional level filter (Preparatory, Bachelor's, Master's)
 * 
 * Returns paginated courses to minimize Firestore reads and payload size.
 */
export async function GET(request: NextRequest) {
    try {
        const auth = await authorizeAdmin(request);
        if (!auth.ok) {
            console.warn('Unauthorized');
            return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
        }
        const { searchParams } = new URL(request.url);
        
        // Parse pagination parameters
        const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
        const requestedLimit = parseInt(searchParams.get('limit') || String(DEFAULT_PAGE_SIZE), 10);
        const limit = Math.min(Math.max(1, requestedLimit), MAX_PAGE_SIZE);
        
        // Parse filter parameters
        const searchQuery = searchParams.get('search')?.trim().toLowerCase() || '';
        const levelFilter = searchParams.get('level')?.trim() || '';
        
        // Fetch courses (uses caching internally - at most 1 Firestore read per day)
        const allCourses = await fetchCourses();
        
        // Apply server-side filtering
        let filteredCourses = allCourses;
        
        if (searchQuery) {
            filteredCourses = allCourses.filter(c =>
                c.title.toLowerCase().includes(searchQuery) ||
                c.description.toLowerCase().includes(searchQuery) ||
                c.tags.some(t => t.toLowerCase().includes(searchQuery)) ||
                c.code.toLowerCase().includes(searchQuery)
            );
        }
        
        if (levelFilter && levelFilter !== 'all') {
            filteredCourses = filteredCourses.filter(c => c.level === levelFilter);
        }
        
        // Calculate pagination
        const total = filteredCourses.length;
        const totalPages = Math.ceil(total / limit);
        const startIndex = (page - 1) * limit;
        const endIndex = Math.min(startIndex + limit, total);
        const paginatedCourses = filteredCourses.slice(startIndex, endIndex);
        
        return NextResponse.json({
            courses: paginatedCourses,
            pagination: {
                page,
                limit,
                total,
                totalPages,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1,
            },
        }, {
            headers: {
                // Enable caching at edge/CDN level for 5 minutes
                'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=86400',
            }
        });
    } catch (error) {
        console.error('Error fetching courses:', error);
        return NextResponse.json(
            { error: 'Failed to fetch courses' }, 
            { status: 500 }
        );
    }
}
