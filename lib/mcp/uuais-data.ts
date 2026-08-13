import { getPublicSeed } from '@/lib/server-data';
import type { Course } from '@/lib/courses';

/**
 * Server-side read helpers for the MCP tools (read-only, no writes).
 * Uses dynamic imports for firebase-admin / courses so an unconfigured
 * admin SDK degrades to `null` instead of throwing during module load.
 * Conventions: list helpers return `null` when unavailable (else an array);
 * lookups return `{ status: 'ok' | 'unavailable', item: T | null }`.
 */

function isTimestampLike(value: unknown): value is { toDate: () => Date } {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { toDate?: unknown }).toDate === 'function' &&
    typeof (value as { seconds?: unknown }).seconds === 'number' &&
    typeof (value as { nanoseconds?: unknown }).nanoseconds === 'number'
  );
}

function sanitize(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (isTimestampLike(value)) return value.toDate().toISOString();
  if (Array.isArray(value)) return value.map(sanitize).filter((v) => v !== undefined);
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>)) {
      const v = sanitize((value as Record<string, unknown>)[key]);
      if (v !== undefined) out[key] = v;
    }
    return out;
  }
  return value;
}

function normalizeDoc(doc: { id: string; data: () => Record<string, unknown> }): Record<string, unknown> {
  return { id: doc.id, ...(sanitize(doc.data()) as Record<string, unknown>) };
}

function snippet(text: string, max = 160): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  return clean.length > max ? `${clean.slice(0, max)}…` : clean;
}

async function getAdminDb() {
  try {
    const { adminDb } = await import('@/lib/firebase-admin');
    return adminDb as typeof adminDb;
  } catch (error) {
    console.error('[mcp-data] firebase-admin unavailable:', error);
    return null;
  }
}

export async function getPublishedBlogPosts(limit: number): Promise<Record<string, unknown>[] | null> {
  const adminDb = await getAdminDb();
  if (!adminDb) return null;
  try {
    const snap = await adminDb
      .collection('blogPosts')
      .where('published', '==', true)
      .orderBy('date', 'desc')
      .limit(Math.max(1, Math.min(limit, 50)))
      .get();
    return snap.docs.map(normalizeDoc);
  } catch (error) {
    console.error('[mcp-data] getPublishedBlogPosts failed:', error);
    return null;
  }
}

export type BlogPostLookup = { status: 'ok'; item: Record<string, unknown> | null } | { status: 'unavailable' };

export async function getBlogPostById(id: string): Promise<BlogPostLookup> {
  const adminDb = await getAdminDb();
  if (!adminDb) return { status: 'unavailable' };
  try {
    const snap = await adminDb.collection('blogPosts').doc(id).get();
    if (!snap.exists) return { status: 'ok', item: null };
    const data = snap.data();
    if (!data || data.published !== true) return { status: 'ok', item: null };
    return { status: 'ok', item: { id: snap.id, ...(sanitize(data) as Record<string, unknown>) } };
  } catch (error) {
    console.error('[mcp-data] getBlogPostById failed:', error);
    return { status: 'unavailable' };
  }
}

export async function getCourses(): Promise<Course[] | null> {
  try {
    const { fetchCourses } = await import('@/lib/courses');
    return await fetchCourses();
  } catch (error) {
    console.error('[mcp-data] fetchCourses failed:', error);
    return null;
  }
}

export type CourseLookup = { status: 'ok'; item: Course | null } | { status: 'unavailable' };

export async function getCourseById(id: string): Promise<CourseLookup> {
  try {
    const { fetchCourseById } = await import('@/lib/courses');
    const course = await fetchCourseById(id);
    return { status: 'ok', item: course ?? null };
  } catch (error) {
    console.error('[mcp-data] fetchCourseById failed:', error);
    return { status: 'unavailable' };
  }
}

export interface EngagementStats {
  topEvents: { id: string; title: string; clicks: number }[];
  topJobs: { id: string; title: string; clicks: number }[];
  topBlogs: { id: string; title: string; reads: number }[];
}

export async function getEngagementStats(limit: number): Promise<EngagementStats | null> {
  const adminDb = await getAdminDb();
  if (!adminDb) return null;
  const n = Math.max(1, Math.min(limit, 10));
  try {
    const [eventsSnap, jobsSnap, blogsSnap] = await Promise.all([
      adminDb.collection('analyticsEvents').orderBy('clicks', 'desc').limit(n).get(),
      adminDb.collection('analyticsJobs').orderBy('clicks', 'desc').limit(n).get(),
      adminDb.collection('analyticsBlogs').orderBy('reads', 'desc').limit(n).get(),
    ]);
    const seed = await getPublicSeed();
    const eventTitles = new Map(seed.events.map((e) => [e.id, e.title]));
    const jobTitles = new Map(seed.jobs.map((j) => [j.id, j.title]));

    const topEvents = eventsSnap.docs.map((d) => ({
      id: d.id,
      title: eventTitles.get(d.id) ?? d.id,
      clicks: Number((d.data() as { clicks?: unknown })?.clicks ?? 0),
    }));
    const topJobs = jobsSnap.docs.map((d) => ({
      id: d.id,
      title: jobTitles.get(d.id) ?? d.id,
      clicks: Number((d.data() as { clicks?: unknown })?.clicks ?? 0),
    }));
    const topBlogs: { id: string; title: string; reads: number }[] = [];
    for (const d of blogsSnap.docs) {
      const reads = Number((d.data() as { reads?: unknown })?.reads ?? 0);
      const post = await getBlogPostById(d.id);
      const title = post.status === 'ok' && post.item ? String(post.item.title ?? d.id) : d.id;
      topBlogs.push({ id: d.id, title, reads });
    }
    return { topEvents, topJobs, topBlogs };
  } catch (error) {
    console.error('[mcp-data] getEngagementStats failed:', error);
    return null;
  }
}

export interface SearchHit {
  type: 'event' | 'blog' | 'faq' | 'job' | 'team' | 'course';
  id: string;
  title: string;
  snippet: string;
}

export async function searchSiteContent(query: string, limit: number): Promise<{ hits: SearchHit[] } | null> {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return { hits: [] };
  const includesAll = (...fields: (string | undefined)[]) => {
    const haystack = fields.filter(Boolean).join(' ').toLowerCase();
    return terms.every((t) => haystack.includes(t));
  };

  const seed = await getPublicSeed();
  const [blog, courses] = await Promise.all([getPublishedBlogPosts(50), getCourses()]);
  const hits: SearchHit[] = [];

  for (const e of seed.events) {
    if (includesAll(e.title, e.description, e.location)) {
      hits.push({ type: 'event', id: e.id, title: e.title, snippet: snippet(e.description) });
    }
  }
  for (const p of blog ?? []) {
    const title = String(p.title ?? '');
    if (includesAll(title, String(p.excerpt ?? ''), String(p.content ?? ''), String(p.author ?? ''))) {
      hits.push({ type: 'blog', id: String(p.id ?? ''), title, snippet: snippet(String(p.excerpt ?? '')) });
    }
  }
  for (const f of seed.faqs) {
    if (includesAll(f.question, f.answer)) {
      hits.push({ type: 'faq', id: f.id, title: f.question, snippet: snippet(f.answer) });
    }
  }
  for (const j of seed.jobs) {
    if (includesAll(j.title, j.company, j.description)) {
      hits.push({ type: 'job', id: j.id, title: `${j.title} — ${j.company}`, snippet: snippet(j.description) });
    }
  }
  for (const t of seed.teamMembers) {
    if (includesAll(t.name, t.position)) {
      hits.push({ type: 'team', id: t.id, title: t.name, snippet: snippet(String(t.position ?? '')) });
    }
  }
  for (const c of courses ?? []) {
    if (includesAll(c.title, c.code, c.description, c.tags?.join(' '), c.Learning_outcomes)) {
      hits.push({ type: 'course', id: c.id, title: `${c.code || c.id} — ${c.title}`, snippet: snippet(c.description) });
    }
  }
  return { hits: hits.slice(0, Math.max(1, Math.min(limit, 25))) };
}

export interface SiteStats {
  available: boolean;
  counts: Record<string, number | null>;
}

export async function getSiteStats(): Promise<SiteStats> {
  const seed = await getPublicSeed();
  const [blog, courses] = await Promise.all([getPublishedBlogPosts(50), getCourses()]);
  const now = new Date().toISOString();
  return {
    available: true,
    counts: {
      events: seed.events.length,
      upcomingEvents: seed.events.filter((e) => e.eventStartAt >= now).length,
      jobs: seed.jobs.length,
      faqs: seed.faqs.length,
      teamMembers: seed.teamMembers.length,
      boardPositions: seed.boardPositions.length,
      openCampaigns: seed.campaigns.length,
      blogPosts: blog?.length ?? null,
      courses: courses?.length ?? null,
    },
  };
}

export interface CourseAnalysis {
  available: boolean;
  analysis: {
    course: {
      id: string;
      code: string;
      title: string;
      level: string | null;
      credits: number | null;
      study_period: string | null;
      language_of_instruction: string | null;
      pace_of_study: string | null;
      location: string | null;
      tags: string[];
    };
    prerequisites: CourseRef[];
    requiredBy: CourseRef[];
    relatedCourses: CourseRef[];
  } | null;
}

export interface CourseRef {
  id: string;
  code: string;
  title: string | null;
  level: string | null;
  credits: number | null;
}

export async function analyzeCourse(courseId: string): Promise<CourseAnalysis> {
  const lookup = await getCourseById(courseId);
  if (lookup.status === 'unavailable') return { available: false, analysis: null };
  const course = lookup.item;
  if (!course) return { available: true, analysis: null };

  const courses = await getCourses();
  const byId = new Map((courses ?? []).map((c) => [c.id, c]));
  const resolve = (ids: string[] | null | undefined): CourseRef[] =>
    (ids ?? []).filter(Boolean).map((id) => {
      const c = byId.get(id);
      return c
        ? { id, code: c.code || c.id, title: c.title, level: c.level ?? null, credits: c.credits ?? null }
        : { id, code: id, title: null, level: null, credits: null };
    });

  return {
    available: true,
    analysis: {
      course: {
        id: course.id,
        code: course.code || course.id,
        title: course.title,
        level: course.level ?? null,
        credits: course.credits ?? null,
        study_period: course.study_period ?? null,
        language_of_instruction: course.language_of_instruction ?? null,
        pace_of_study: course.pace_of_study ?? null,
        location: course.location ?? null,
        tags: course.tags ?? [],
      },
      prerequisites: resolve(course.prerequisites),
      requiredBy: resolve(course.prerequisite_of),
      relatedCourses: resolve(course.relatedCourses),
    },
  };
}
