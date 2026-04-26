/**
 * Program Course to Firestore Course Mapping
 * 
 * Maps program course codes to Firestore course IDs.
 * Used when automatic code matching fails or needs override.
 */

import { CourseMapping, manualCourseMappings } from "./course-mappings-types";
export type { CourseMapping } from "./course-mappings-types";
export { manualCourseMappings } from "./course-mappings-types";

/**
 * Attempt to match a program course code to a Firestore course
 * First checks manual mappings, then tries to find by code field
 */
export async function matchProgramCourseToFirestore(
  programCode: string,
  courseTitle: string,
  allCourses: { id: string; code: string; title: string }[]
): Promise<CourseMapping> {
  // 1. Check manual mappings first
  const manual = manualCourseMappings[programCode];
  if (manual) {
    return manual;
  }

  // 2. Try exact code match
  const exactMatch = allCourses.find(
    (c) => c.code.toUpperCase() === programCode.toUpperCase()
  );
  if (exactMatch) {
    return {
      programCode,
      courseId: exactMatch.id,
      matchConfidence: "exact",
    };
  }

  // 3. Try fuzzy title match (basic implementation)
  const normalizedTitle = courseTitle.toLowerCase().trim();
  const fuzzyMatch = allCourses.find((c) => {
    const normalizedCourseTitle = c.title.toLowerCase().trim();
    // Check if titles contain each other or share significant words
    return (
      normalizedCourseTitle.includes(normalizedTitle) ||
      normalizedTitle.includes(normalizedCourseTitle) ||
      calculateTitleSimilarity(normalizedTitle, normalizedCourseTitle) > 0.8
    );
  });

  if (fuzzyMatch) {
    return {
      programCode,
      courseId: fuzzyMatch.id,
      matchConfidence: "fuzzy",
      notes: `Fuzzy matched to: ${fuzzyMatch.title}`,
    };
  }

  // 4. No match found
  return {
    programCode,
    matchConfidence: "unlinked",
    notes: "No matching course found in database",
  };
}

/**
 * Simple similarity calculation between two strings
 * Returns value between 0 and 1
 */
function calculateTitleSimilarity(a: string, b: string): number {
  const wordsA = a.split(/\s+/);
  const wordsB = b.split(/\s+/);
  
  const setA = new Set(wordsA);
  const setB = new Set(wordsB);
  
  const intersection = new Set([...setA].filter((x) => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  
  return intersection.size / union.size;
}

/**
 * Batch match multiple program courses
 */
export async function matchMultipleProgramCourses(
  programCodes: { code: string; title: string }[],
  allCourses: { id: string; code: string; title: string }[]
): Promise<Map<string, CourseMapping>> {
  const results = new Map<string, CourseMapping>();
  
  for (const { code, title } of programCodes) {
    const mapping = await matchProgramCourseToFirestore(code, title, allCourses);
    results.set(code, mapping);
  }
  
  return results;
}
