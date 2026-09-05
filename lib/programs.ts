/**
 * Programme data: types, loading and selectors. Plans are committed JSON, not Firestore rows,
 * so a re-scrape lands as a reviewable diff; course detail still comes from lib/courses.ts.
 */

import fs from 'fs';
import path from 'path';

import index from '@/data/programs/index.json';

export { programTitleParts } from '@/lib/programs/format';

// ---- Types ----

export type ProgramCourseCategory =
  | 'MANDATORY_CORE'
  | 'MANDATORY_ELECTIVE'
  | 'OPTIONAL_ELECTIVE'
  | 'PROJECT_THESIS'
  | 'OTHER';

export type ProgramEdgeType = 'HARD' | 'SOFT' | 'EXCLUSIVE';

export type ProgramCourse = {
  code: string;
  titleEn: string;
  titleSv: string;
  credits: number | null;
  /** Set only when the course is split across periods, e.g. 5 of 10. */
  creditsInPeriod: number | null;
  /**
   * The share of this course's credits falling in this semester, so a semester total sums
   * this rather than `credits`.
   */
  creditsInSemester: number | null;
  compulsory: boolean;
  category: ProgramCourseCategory;
  mainFieldEn: string | null;
  /** Depth of study, e.g. 'G1N' (basic) or 'A1F' (advanced). */
  depthCode: string | null;
  semester: number;
  periods: string[];
  /** null means the course is in the common trunk, taken by every student. */
  trackId: string | null;
  /** True when only students on this programme may take the course. */
  onlyProgramme: boolean | null;
  /** The university's own requirement wording, which the edges were derived from. */
  entryRequirements: string | null;
};

export type ProgramTrack = {
  id: string;
  /** Shared by a bare specialisation and all of its profiles. */
  specialisationId: string;
  specialisationSv: string;
  profileSv: string | null;
  descriptionSv: string | null;
  fromSemester: number;
};

export type ProgramRuleType =
  | 'CHOOSE_ONE'
  | 'MUTUALLY_EXCLUSIVE'
  | 'COHORT_SUBSTITUTION'
  | 'RECOMMENDED'
  | 'EITHER_OR'
  | 'NOTE';

/** A note from the study plan, classified into a machine-readable rule. */
export type ProgramRule = {
  id: string;
  type: ProgramRuleType;
  courseCodes: string[];
  semester: number;
  trackId: string | null;
  /** The source prose, always kept so the UI can fall back to showing it verbatim. */
  textSv: string;
  labelEn: string | null;
  cohortBefore: number | null;
};

export type ProgramEdge = {
  from: string;
  to: string;
  type: ProgramEdgeType;
  source: 'llm' | 'manual';
};

export type Program = {
  id: string;
  code: string;
  revisionId: string;
  nameSv: string;
  nameEn?: string;
  totalCredits: number | null;
  semesters: number;
  registrationNumber: string | null;
  finalisedDate: string | null;
  tracks: ProgramTrack[];
  courses: ProgramCourse[];
  rules: ProgramRule[];
  edges: ProgramEdge[];
  revisions: { id: string; name: string }[];
  scrapedAt: string;
  sourceUrl: string;
  /** Which academic year this plan governs, e.g. "giltig från och med ht 2026". */
  validFrom: string | null;
  validFromYear: number | null;
  /** False until a person has checked the generated edges and rules. */
  reviewed: boolean;
  programmeTitle: string;
  /** The same programme in the university's English catalogue, matched by code. */
  programmeTitleEn: string | null;
  programmeUri: string;
  planFormat: 'legacy' | 'ladok';
};

export type ProgramIndexEntry = {
  file: string;
  code: string;
  nameSv: string;
  programmeTitle: string;
  /** UU's own English title. One per programme code, so every variant shares it. */
  programmeTitleEn: string | null;
  totalCredits: number | null;
  semesters: number;
  courses: number;
  tracks: number;
  planFormat: 'legacy' | 'ladok';
  validFrom: string | null;
  validFromYear: number | null;
};

export type ProgramIndex = {
  faculty: string;
  scrapedAt: string;
  programmes: ProgramIndexEntry[];
};

/** A specialisation and the profiles beneath it, as the track picker presents them. */
export type ProgramSpecialisation = {
  id: string;
  nameSv: string;
  descriptionSv: string | null;
  /** The bare specialisation track, whose courses every profile inherits. */
  baseTrackId: string | null;
  profiles: ProgramTrack[];
};

// ---- Categorisation ----

const THESIS_PATTERN = /(examensarbete|degree project|självständigt arbete)/i;
const PROJECT_PATTERN = /(\bprojekt\b|\bproject\b)/i;

/**
 * Assigns the colour category a course card is drawn with: `compulsory` comes from the study
 * plan, everything else is a judgement the plan does not encode.
 */
export function categoriseCourse(
  course: Pick<ProgramCourse, 'compulsory' | 'trackId' | 'titleEn' | 'titleSv' | 'credits'>
): ProgramCourseCategory {
  const title = `${course.titleEn} ${course.titleSv}`;

  if (THESIS_PATTERN.test(title) || (course.credits ?? 0) >= 30) return 'PROJECT_THESIS';
  if (course.compulsory) return 'MANDATORY_CORE';
  if (PROJECT_PATTERN.test(title)) return 'PROJECT_THESIS';
  // Inside a track, a non-compulsory course is still a required choice for that track.
  if (course.trackId) return 'MANDATORY_ELECTIVE';
  return 'OPTIONAL_ELECTIVE';
}

// ---- Loading ----

/**
 * Fields the committed JSON keeps as an audit trail but nothing renders: the Swedish main field
 * of study, and the requirement clause each edge was derived from. Dropped on load rather than
 * shipped, because together they are roughly a sixth of what a programme page sends the browser.
 */
type RawProgram = Omit<Program, 'courses' | 'edges'> & {
  courses: (Omit<ProgramCourse, 'category'> & { mainFieldSv?: string | null })[];
  edges: (ProgramEdge & { rationale?: string })[];
};

const INDEX = index as ProgramIndex;
const DATA_DIR = path.join(process.cwd(), 'data', 'programs');

/**
 * Read from disk on demand and cached per process: a static import would put all 77 plans -
 * several megabytes - into every serverless bundle that touches this module.
 */
const cache = new Map<string, Program | null>();

function without<T extends object, K extends keyof T>(source: T, key: K): Omit<T, K> {
  const copy = { ...source };
  delete copy[key];
  return copy;
}

function hydrate(raw: RawProgram): Program {
  return {
    ...raw,
    courses: raw.courses.map((course) => ({
      ...without(course, 'mainFieldSv'),
      category: categoriseCourse(course),
    })),
    edges: raw.edges.map((edge) => without(edge, 'rationale')),
  };
}

/** Which file holds a programme, resolved case-insensitively by code or filename. */
function entryFor(code: string): ProgramIndexEntry | null {
  const wanted = code.toLowerCase();
  return (
    INDEX.programmes.find((p) => p.file.replace(/\.json$/, '') === wanted) ??
    INDEX.programmes.find((p) => p.code.toLowerCase() === wanted) ??
    null
  );
}

export function getProgram(code: string): Program | null {
  const key = code.toLowerCase();
  const cached = cache.get(key);
  if (cached !== undefined) return cached;

  const entry = entryFor(key);
  let program: Program | null = null;
  if (entry) {
    try {
      const raw = JSON.parse(
        fs.readFileSync(path.join(DATA_DIR, entry.file), 'utf8')
      ) as RawProgram;
      program = hydrate(raw);
    } catch (error) {
      console.error(`[Programs] Could not read ${entry.file}:`, error);
    }
  }
  cache.set(key, program);
  return program;
}

/** The slug a programme is addressed by, which is its filename without the extension. */
export function programSlug(entry: ProgramIndexEntry): string {
  return entry.file.replace(/\.json$/, '');
}

export function listPrograms(): ProgramIndexEntry[] {
  return INDEX.programmes;
}

export function getProgramIndex(): ProgramIndex {
  return INDEX;
}

// ---- Selectors ----
// Re-exported for the browser: the page is static, so the specialisation filter runs there.
export {
  getSpecialisations,
  getVisibleCourses,
  getVisibleEdges,
  getVisibleRules,
  groupBySemester,
} from '@/lib/programs/select';
