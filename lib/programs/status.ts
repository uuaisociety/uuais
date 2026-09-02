/**
 * Turning certificate data into a per-course status, free of any server import so the same
 * logic runs in the browser for hand-marked courses.
 */

import type { ProgramCourse, ProgramEdge } from '@/lib/programs';

export type CourseStatus = 'COMPLETED' | 'IN_PROGRESS' | 'UPCOMING' | 'NOT_STARTED';

export type ProgramProgress = {
  statuses: Record<string, CourseStatus>;
  counts: Record<CourseStatus, number>;
  /** Share of the programme's compulsory credits already earned, 0-100. */
  percentComplete: number;
  creditsCompleted: number;
  creditsRequired: number;
};

export type TranscriptEntry = {
  rawCourseName?: string;
  rawCourseCode?: string;
  credits?: number;
};

export type StoredRegistration = {
  code?: string;
  title?: string;
  current?: boolean;
};

function normaliseTitle(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * Resolves transcript rows onto course codes. Every entry counts as passed — a course reaches
 * the "Completed courses" table only once it has been; titles are the fallback for uncoded rows.
 */
export function matchTranscript(
  courses: ProgramCourse[],
  entries: TranscriptEntry[],
  registrations: StoredRegistration[] = []
): { passed: Set<string>; registered: Set<string> } {
  const byCode = new Map(courses.map((c) => [c.code.toUpperCase(), c.code]));
  const byTitle = new Map<string, string>();
  for (const course of courses) {
    for (const title of [course.titleEn, course.titleSv]) {
      const key = normaliseTitle(title ?? '');
      if (key && !byTitle.has(key)) byTitle.set(key, course.code);
    }
  }

  const passed = new Set<string>();
  const registered = new Set<string>();

  const resolve = (rawCode?: string, rawTitle?: string) =>
    byCode.get((rawCode ?? '').trim().toUpperCase()) ??
    byTitle.get(normaliseTitle(rawTitle ?? ''));

  for (const entry of entries) {
    const code = resolve(entry.rawCourseCode, entry.rawCourseName);
    if (code) passed.add(code);
  }

  // Only a currently running registration means in progress; a finished one proves nothing.
  for (const registration of registrations) {
    if (!registration.current) continue;
    const code = resolve(registration.code, registration.title);
    if (code) registered.add(code);
  }

  // A course both passed and re-registered counts as passed.
  for (const code of passed) registered.delete(code);
  return { passed, registered };
}

/**
 * Derives each course's status. UPCOMING requires every hard prerequisite passed, which is
 * what answers "what can I take next?"; soft and exclusive edges are advisory and do not gate.
 */
export function deriveStatuses(
  courses: ProgramCourse[],
  edges: ProgramEdge[],
  passed: Set<string>,
  registered: Set<string>
): Record<string, CourseStatus> {
  const hardPrereqs = new Map<string, string[]>();
  for (const edge of edges) {
    if (edge.type !== 'HARD') continue;
    const list = hardPrereqs.get(edge.to);
    if (list) list.push(edge.from);
    else hardPrereqs.set(edge.to, [edge.from]);
  }

  const statuses: Record<string, CourseStatus> = {};
  for (const course of courses) {
    if (passed.has(course.code)) {
      statuses[course.code] = 'COMPLETED';
    } else if (registered.has(course.code)) {
      statuses[course.code] = 'IN_PROGRESS';
    } else {
      const required = hardPrereqs.get(course.code) ?? [];
      statuses[course.code] = required.every((code) => passed.has(code))
        ? 'UPCOMING'
        : 'NOT_STARTED';
    }
  }
  return statuses;
}

export function summarise(
  courses: ProgramCourse[],
  statuses: Record<string, CourseStatus>
): ProgramProgress {
  const counts: Record<CourseStatus, number> = {
    COMPLETED: 0,
    IN_PROGRESS: 0,
    UPCOMING: 0,
    NOT_STARTED: 0,
  };
  let creditsCompleted = 0;
  let creditsRequired = 0;

  for (const course of courses) {
    const status = statuses[course.code] ?? 'NOT_STARTED';
    counts[status] += 1;
    // Measured against what the degree demands, so the optional pool does not dilute it.
    if (!course.compulsory) continue;
    // Per-semester share, so a course spanning two semesters is not counted twice.
    const credits = course.creditsInSemester ?? course.credits ?? 0;
    creditsRequired += credits;
    if (status === 'COMPLETED') creditsCompleted += credits;
  }

  return {
    statuses,
    counts,
    creditsCompleted,
    creditsRequired,
    percentComplete: creditsRequired > 0 ? Math.round((creditsCompleted / creditsRequired) * 100) : 0,
  };
}
