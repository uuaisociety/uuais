import { adminDb } from '@/lib/firebase-admin';
import { gzipSync, gunzipSync } from 'zlib';

// ---- Cache Configuration ----
const CACHE_DOC_ID = 'courses_cache_v1';
const CACHE_COLLECTION = '_cache';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// In-memory cache for the current process (faster than Firestore read)
let memoryCache: { courses: Course[]; timestamp: number } | null = null;

/**
 * Get courses from persistent cache or refresh from source.
 * This ensures at most 1 read per day for the full course catalog,
 * regardless of how many users or server instances are active.
 */
async function getCachedCourses(): Promise<Course[]> {
  const now = Date.now();
  
  // 1. Check in-memory cache first (fastest, same process)
  if (memoryCache && (now - memoryCache.timestamp) < CACHE_TTL_MS) {
    console.log("Returning memoryCache");
    return memoryCache.courses;
  }
  
  try {
    // 2. Check persistent Firestore cache (shared across all instances)
    const cacheDoc = await adminDb.collection(CACHE_COLLECTION).doc(CACHE_DOC_ID).get();
    
    if (cacheDoc.exists) {
      const data = cacheDoc.data();
      const cacheAge = now - (data?.updatedAt ?? 0);
      
      if (cacheAge < CACHE_TTL_MS && data?.data && data?.compressed) {
        // Persistent cache is valid - decompress and use it
        const compressed = Buffer.from(data.data, 'base64');
        const decompressed = gunzipSync(compressed);
        const courses = JSON.parse(decompressed.toString()) as Course[];
        memoryCache = { courses, timestamp: now };
        console.log("Returning cacheDoc");
        return courses;
      }
    }
    
    // 3. Cache miss or expired - refresh from source
    return await refreshCourseCache();
  } catch (error) {
    console.error('Cache read failed, falling back to source:', error);
    // Fallback: fetch directly from source without caching
    return await fetchCoursesFromSource();
  }
}

/**
 * Sanitize course data for Firestore storage by removing undefined values.
 * Firestore doesn't accept undefined as a valid value.
 */
function sanitizeCourseForCache(course: Course): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(course)) {
    if (value !== undefined) {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

/**
 * Refresh the cache by fetching all courses from Firestore and storing them.
 * This is the ONLY place where we read the entire courses collection.
 */
async function refreshCourseCache(): Promise<Course[]> {
  console.log("Refreshing course cache");
  const courses = await fetchCoursesFromSource();
  const now = Date.now();
  
  try {
    // Sanitize courses before storing (Firestore doesn't accept undefined)
    const sanitizedCourses = courses.map(sanitizeCourseForCache);
    
    // Compress courses to fit within Firestore's 1MB document limit
    const jsonString = JSON.stringify(sanitizedCourses);
    const compressed = gzipSync(jsonString);
    const base64Data = compressed.toString('base64');
    
    // Store in persistent cache (shared across all instances)
    await adminDb.collection(CACHE_COLLECTION).doc(CACHE_DOC_ID).set({
      data: base64Data,
      compressed: true,
      updatedAt: now,
      version: 2,
      courseCount: courses.length,
    });
    
    // Update in-memory cache
    memoryCache = { courses, timestamp: now };
    
    console.log(`[Courses] Cache refreshed with ${courses.length} courses at ${new Date(now).toISOString()}`);
  } catch (error) {
    console.error('Failed to write cache, but returning courses:', error);
  }
  
  return courses;
}

/**
 * Direct fetch from Firestore source - expensive operation, use sparingly.
 */
async function fetchCoursesFromSource(): Promise<Course[]> {
  const snapshot = await adminDb.collection('courses').get();
  return snapshot.docs.map(doc => docToCourse(doc.id, doc.data() as Record<string, unknown>));
}

/**
 * Force refresh the cache - useful for admin operations or scheduled jobs.
 */
export async function invalidateCourseCache(): Promise<void> {
  memoryCache = null;
  try {
    await adminDb.collection(CACHE_COLLECTION).doc(CACHE_DOC_ID).delete();
  } catch {
    // Ignore if doesn't exist
  }
}

export type Course = {
  id: string;
  title: string;
  code: string;
  link: string;
  description: string;
  Learning_outcomes: string;
  tags: string[];
  relatedCourses: string[];
  requirements?: string[];
  generalRequirements?: string[];
  level?: 'Preparatory' | "Bachelor's" | "Master's";
  credits?: number;
  entry_requirements?: string;
  prerequisites?: string | null;
  prerequisite_of?: string | null;
  language_of_instruction?: string;
  pace_of_study?: string;
  location?: string;
  study_period?: string;
  fees?: string;
  about_blurb?: string;
  application_code?: string;
  application_deadline?: string;
  instruction?: string;
  assessment?: string;
  syllabus?: string;
  structured_requirements?: StructuredRequirement;
};

// ---- Structured Requirements Types ----

export type RequirementType =
  | 'AND'
  | 'OR'
  | 'COURSE'
  | 'CREDITS'
  | 'DOMAIN_CREDITS'
  | 'TOPIC'
  | 'LANGUAGE'
  | 'CUSTOM';

export interface BaseRequirement {
  type: RequirementType;
  label?: string;
}

export interface AndRequirement extends BaseRequirement {
  type: 'AND';
  children: StructuredRequirement[];
}

export interface OrRequirement extends BaseRequirement {
  type: 'OR';
  children: StructuredRequirement[];
}

export interface CourseRequirement extends BaseRequirement {
  type: 'COURSE';
  courseId: string;
  courseCode: string;
  courseTitle: string;
}

export interface CreditsRequirement extends BaseRequirement {
  type: 'CREDITS';
  minCredits: number;
}

export interface DomainCreditsRequirement extends BaseRequirement {
  type: 'DOMAIN_CREDITS';
  domain: string;
  minCredits: number;
}

export interface TopicRequirement extends BaseRequirement {
  type: 'TOPIC';
  topic: string;
}

export interface LanguageRequirement extends BaseRequirement {
  type: 'LANGUAGE';
  language: string;
  level: string;
}

export interface CustomRequirement extends BaseRequirement {
  type: 'CUSTOM';
  text: string;
}

export type StructuredRequirement =
  | AndRequirement
  | OrRequirement
  | CourseRequirement
  | CreditsRequirement
  | DomainCreditsRequirement
  | TopicRequirement
  | LanguageRequirement
  | CustomRequirement;

// ---- Helper to normalize a Firestore course doc to Course type ----

function normalizeLevel(lvl?: string): Course['level'] | undefined {
  if (!lvl) return undefined;
  const v = lvl.toLowerCase();
  if (v.includes('preparatory')) return 'Preparatory';
  if (v.includes("bachelor")) return "Bachelor's";
  if (v.includes("master")) return "Master's";
  return undefined;
}

function docToCourse(id: string, data: Record<string, unknown>): Course {
  const title = (data.Course_name as string)?.trim() || (data.title as string)?.trim() || 'Untitled Course';
  const code = (data.code as string) || '';
  const link = (data.Link as string) || (data.link as string) || '';
  const description = (data.course_content as string)?.trim() || (data.description as string)?.trim() || '';
  const Learning_outcomes = (data.Learning_outcomes as string) || (data.learning_outcomes as string) || '';
  const level = normalizeLevel(data.level as string | undefined);
  const creditsRaw = data.credits;
  const credits = typeof creditsRaw === 'number' ? creditsRaw : (typeof creditsRaw === 'string' ? parseFloat(creditsRaw) || undefined : undefined);
  const creditsTag = credits ? `${credits} credits` : (typeof creditsRaw === 'string' ? creditsRaw : '');

  const tags = [
    ...(creditsTag ? [creditsTag] : []),
    ...(data.language_of_instruction ? [data.language_of_instruction as string] : (data.language ? [data.language as string] : [])),
    ...(data.location ? [data.location as string] : []),
    ...(level ? [level] : []),
    ...((data.tags as string[]) || []),
  ];

  const entry_requirements = (data.entry_requirements as string) || undefined;
  const generalRequirements = entry_requirements ? [entry_requirements] : [];

  return {
    id,
    title,
    code,
    link,
    description,
    Learning_outcomes,
    tags,
    relatedCourses: (data.relatedCourses as string[]) || [],
    requirements: (data.requirements as string[]) || [],
    generalRequirements,
    level,
    credits,
    entry_requirements,
    prerequisites: (data.prerequisites as string | null) ?? null,
    prerequisite_of: (data.prerequisite_of as string | null) ?? null,
    language_of_instruction: (data.language_of_instruction as string) || (data.language as string) || undefined,
    pace_of_study: (data.pace_of_study as string) || undefined,
    location: (data.location as string) || undefined,
    study_period: (data.study_period as string) || (data.period as string) || undefined,
    fees: (data.fees as string) || undefined,
    about_blurb: (data.about_blurb as string) || undefined,
    application_code: (data.application_code as string) || undefined,
    application_deadline: (data.application_deadline as string) || undefined,
    instruction: (data.Instruction as string) || (data.instruction as string) || undefined,
    assessment: (data.Assessment as string) || (data.assessment as string) || undefined,
    syllabus: (data.Syllabus as string) || (data.syllabus as string) || undefined,
    structured_requirements: (data.structured_requirements as StructuredRequirement) || undefined,
  };
}

// ---- Server-side Firestore data access ----

export async function fetchCourses(): Promise<Course[]> {
  return getCachedCourses();
}

export async function fetchCourseById(id: string): Promise<Course | undefined> {
  const doc = await adminDb.collection('courses').doc(id).get();
  if (!doc.exists) return undefined;
  return docToCourse(doc.id, doc.data() as Record<string, unknown>);
}

export async function searchCourses(query: string): Promise<Course[]> {
  const courses = await fetchCourses();
  const q = query.trim().toLowerCase();
  if (!q) return courses;
  return courses.filter((c) =>
    c.title.toLowerCase().includes(q) ||
    c.description.toLowerCase().includes(q) ||
    c.tags.some((t) => t.toLowerCase().includes(q)) ||
    c.code.toLowerCase().includes(q)
  );
}
