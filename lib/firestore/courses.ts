import type { Course } from '@/lib/courses';

/**
 * Client-side course fetching via API route with pagination support.
 * Use this in "use client" components instead of importing fetchCourses from lib/courses
 * (which uses firebase-admin and only works server-side).
 */

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 50;
const COURSE_LIST_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

type CourseListCacheEntry = {
    data: PaginatedCourses;
    expiresAt: number;
};

const paginatedCoursesCache = new Map<string, CourseListCacheEntry>();
const individualCourseCache = new Map<string, Course>();

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
    const cacheKey = params.toString();
    const now = Date.now();
    const cached = paginatedCoursesCache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
        return cached.data;
    }

    const res = await fetch(`/api/courses?${params.toString()}`, {
        // Enable Next.js data caching
        headers: { Authorization: `Bearer ${token}` },
    });
    
    if (!res.ok) {
        throw new Error('Failed to fetch courses');
    }
    
    const data = await res.json();
    paginatedCoursesCache.set(cacheKey, {
        data,
        expiresAt: now + COURSE_LIST_CACHE_TTL_MS,
    });
    for (const course of data.courses) {
        individualCourseCache.set(course.id, course);
    }

    return data;
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

/**
 * Fetch specific courses by ID while avoiding duplicate requests.
 */
export async function fetchCoursesByIdsClient(ids: string[], token?: string): Promise<Course[]> {
    const uniqueIds = Array.from(new Set(ids)).filter(Boolean);
    if (uniqueIds.length === 0) return [];

    const missingIds = uniqueIds.filter((id) => !individualCourseCache.has(id));
    if (missingIds.length > 0) {
        const res = await fetch('/api/courses/batch', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ ids: missingIds }),
        });

        if (!res.ok) {
            throw new Error('Failed to fetch batch courses');
        }

        const data = await res.json() as { courses: Course[] };
        for (const course of data.courses) {
            individualCourseCache.set(course.id, course);
        }
    }

    return uniqueIds
        .map((id) => individualCourseCache.get(id))
        .filter((course): course is Course => Boolean(course));
}

/**
 * Seed course cache from already loaded UI data.
 */
export function primeCourseClientCache(courses: Course[]): void {
    for (const course of courses) {
        individualCourseCache.set(course.id, course);
    }
}
