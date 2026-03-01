import type { Course } from '@/lib/courses';

/**
 * Client-side course fetching via API route.
 * Use this in "use client" components instead of importing fetchCourses from lib/courses
 * (which uses firebase-admin and only works server-side).
 */

let cachedCourses: Course[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export async function fetchCoursesClient(): Promise<Course[]> {
    const now = Date.now();
    if (cachedCourses && (now - cacheTimestamp) < CACHE_TTL_MS) {
        return cachedCourses;
    }

    const res = await fetch('/api/courses');
    if (!res.ok) {
        throw new Error('Failed to fetch courses');
    }
    const data = await res.json();
    cachedCourses = data.courses as Course[];
    cacheTimestamp = now;
    return cachedCourses;
}

// Do not use, very inefficient
// export async function fetchCourseByIdClient(id: string): Promise<Course | undefined> {
//     const courses = await fetchCoursesClient();
//     return courses.find(c => c.id === id);
// }
