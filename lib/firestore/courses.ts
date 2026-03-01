import type { Course } from '@/lib/courses';

/**
 * Client-side course fetching via API route with pagination support.
 * Use this in "use client" components instead of importing fetchCourses from lib/courses
 * (which uses firebase-admin and only works server-side).
 */

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 50;

export interface PaginatedCourses {
    courses: Course[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasNextPage: boolean;
        hasPrevPage: boolean;
    };
}

interface FetchCoursesOptions {
    page?: number;
    limit?: number;
    search?: string;
    level?: string;
    token?: string;
}

/**
 * Fetch paginated courses from the API.
 * Supports server-side filtering and pagination to minimize data transfer.
 */
export async function fetchCoursesClient(options: FetchCoursesOptions = {}): Promise<PaginatedCourses> {
    const { page = 1, limit = DEFAULT_PAGE_SIZE, search = '', level = '', token } = options;
    
    // Clamp limit to max page size
    const clampedLimit = Math.min(Math.max(1, limit), MAX_PAGE_SIZE);
    
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', String(clampedLimit));
    if (search) params.set('search', search);
    if (level && level !== 'all') params.set('level', level);
    const res = await fetch(`/api/courses?${params.toString()}`, {
        // Enable Next.js data caching
        headers: { Authorization: `Bearer ${token}` },
    });
    
    if (!res.ok) {
        throw new Error('Failed to fetch courses');
    }
    
    return res.json();
}

/**
 * Fetch all courses by paginating through all pages.
 * Use sparingly - prefer using server-side filtering instead.
 */
export async function fetchAllCoursesClient(token: string): Promise<Course[]> {
    const allCourses: Course[] = [];
    let page = 1;
    let hasMore = true;
    
    while (hasMore) {
        const result = await fetchCoursesClient({ page, limit: MAX_PAGE_SIZE, token: token });
        allCourses.push(...result.courses);
        hasMore = result.pagination.hasNextPage;
        page++;
        
        // Safety limit - prevent infinite loops
        if (page > 100) break;
    }
    
    return allCourses;
}
