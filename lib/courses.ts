import { adminDb } from '@/lib/firebase-admin';

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

let coursesCache: Course[] | null = null;
let lastFetch = 0;
const CACHE_TTL = 24*60*60*1000; // 1 day

export async function fetchCourses(): Promise<Course[]> {
  const now = Date.now();
  if (coursesCache && (now - lastFetch < CACHE_TTL)) {
    return coursesCache;
  }
  const snapshot = await adminDb.collection('courses').get();
  coursesCache = snapshot.docs.map(doc => docToCourse(doc.id, doc.data() as Record<string, unknown>));
  lastFetch = now;
  return coursesCache;
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
