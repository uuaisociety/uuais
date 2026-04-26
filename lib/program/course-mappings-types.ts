/**
 * Program Course to Firestore Course Mapping Types
 * 
 * This file contains types and constants (no server actions)
 */

export interface CourseMapping {
  programCode: string;
  courseId?: string; // Firestore document ID
  matchConfidence: "exact" | "fuzzy" | "manual" | "unlinked";
  notes?: string;
}

// Manual overrides for course mappings
// These take precedence over automatic matching
export const manualCourseMappings: Record<string, CourseMapping> = {
  // Example entries - update with actual Firestore IDs when available
  // "1TE609": {
  //   programCode: "1TE609",
  //   courseId: "firestore-id-here",
  //   matchConfidence: "manual",
  //   notes: "Introduction to Engineering Physics"
  // },
};
