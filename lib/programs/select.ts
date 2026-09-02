/**
 * View selectors over a loaded programme, kept free of the disk read in lib/programs.ts: the
 * page is statically rendered, so the specialisation filter has to happen client-side.
 */

import type {
  Program,
  ProgramCourse,
  ProgramEdge,
  ProgramRule,
  ProgramSpecialisation,
  ProgramTrack,
} from '@/lib/programs';

/**
 * Groups tracks into the specialisation -> profile shape the picker needs; a specialisation's
 * bare track carries the courses common to all of its profiles.
 */
export function getSpecialisations(program: {
  tracks: ProgramTrack[];
}): ProgramSpecialisation[] {
  const grouped = new Map<string, ProgramSpecialisation>();

  for (const track of program.tracks) {
    let entry = grouped.get(track.specialisationId);
    if (!entry) {
      entry = {
        id: track.specialisationId,
        nameSv: track.specialisationSv,
        descriptionSv: null,
        baseTrackId: null,
        profiles: [],
      };
      grouped.set(track.specialisationId, entry);
    }

    if (track.profileSv) {
      entry.profiles.push(track);
    } else {
      entry.baseTrackId = track.id;
      // The bare header carries the specialisation's own name and description.
      entry.nameSv = track.specialisationSv;
    }
    if (!entry.descriptionSv && track.descriptionSv) entry.descriptionSv = track.descriptionSv;
  }

  return Array.from(grouped.values());
}

/**
 * The trunk plus a chosen track's courses. A profile also shows its bare specialisation's
 * courses, and a bare specialisation its profiles' — some list nothing of their own past year 4.
 */
export function getVisibleCourses(
  program: Pick<Program, 'courses' | 'tracks'>,
  trackId?: string | null
): ProgramCourse[] {
  if (!trackId) return program.courses.filter((c) => c.trackId === null);

  const track = program.tracks.find((t) => t.id === trackId);
  const visible = new Set<string | null>([null, trackId]);

  if (track?.profileSv) {
    const base = program.tracks.find(
      (t) => t.specialisationId === track.specialisationId && !t.profileSv
    );
    if (base) visible.add(base.id);
  } else if (track) {
    for (const sibling of program.tracks) {
      if (sibling.specialisationId === track.specialisationId) visible.add(sibling.id);
    }
  }

  return program.courses.filter((c) => visible.has(c.trackId));
}

/** Groups courses by semester, returning one bucket per semester in order. */
export function groupBySemester(
  program: Pick<Program, 'semesters'>,
  courses: ProgramCourse[]
): { semester: number; courses: ProgramCourse[]; credits: number }[] {
  const buckets = new Map<number, ProgramCourse[]>();
  for (let i = 1; i <= program.semesters; i += 1) buckets.set(i, []);
  for (const course of courses) {
    // A course can only sit in a semester the programme actually has.
    buckets.get(course.semester)?.push(course);
  }

  return Array.from(buckets.entries()).map(([semester, list]) => ({
    semester,
    courses: list,
    credits: list.reduce((sum, c) => sum + (c.compulsory ? c.creditsInSemester ?? 0 : 0), 0),
  }));
}

/** Restricts edges to pairs where both endpoints are on screen. */
export function getVisibleEdges(edges: ProgramEdge[], courses: ProgramCourse[]): ProgramEdge[] {
  const present = new Set(courses.map((c) => c.code));
  return edges.filter((e) => present.has(e.from) && present.has(e.to));
}

/** Rules attached to the trunk or to the selected track. */
export function getVisibleRules(
  program: Pick<Program, 'rules'>,
  trackId?: string | null
): ProgramRule[] {
  return program.rules.filter((r) => r.trackId === null || r.trackId === trackId);
}
