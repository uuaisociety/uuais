/**
 * Program data types for the program explorer feature.
 * Supports Engineering Physics (TTF2Y) and future program expansion.
 */

export interface Program {
  id: string;
  code: string;
  name: string;
  credits: number;
  validFrom: string;
  finalizedBy: string;
  registrationNumber: string;
  semesters: ProgramSemester[];
  tracks: ProgramTrack[];
  requirements: DegreeRequirements;
}

export interface ProgramSemester {
  number: number;
  periods: ProgramPeriod[];
}

export interface ProgramPeriod {
  number: number;
  courses: ProgramCourse[];
}

export interface ProgramCourse {
  code: string;
  title: string;
  credits: number;
  isMandatory: boolean;
  courseId?: string;
  requirements?: string[];
  fieldOfStudy?: string[];
}

export interface ProgramTrack {
  id: string;
  name: string;
  description: string;
  // These are Firestore document IDs (course IDs), not course codes
  // e.g., "1TD722", "1DL301" - these reference /courses/<id>/
  requiredCourseIds: string[];
  electiveCourseIds: string[];
  color: string;
  // Deprecated aliases for backward compatibility
  /** @deprecated Use requiredCourseIds */
  requiredCourses?: string[];
  /** @deprecated Use electiveCourseIds */
  electiveCourses?: string[];
}

export interface DegreeRequirements {
  totalCredits: number;
  mandatoryCredits: number;
  electiveCredits: number;
  categories: RequirementCategory[];
}

export interface RequirementCategory {
  id: string;
  name: string;
  minCredits: number;
  courseCodes: string[];
}

export interface ProgramProgress {
  programId: string;
  completedCourseCodes: string[];
  selectedTrackId?: string;
  lastUpdated: number;
}

export interface ProgramCourseMatch {
  programCourse: ProgramCourse;
  matchedCourseId?: string;
  matchStatus: 'exact' | 'fuzzy' | 'unlinked';
}
