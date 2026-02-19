import { adminDb } from '@/lib/firebase-admin';
import { generateEmbedding, createCourseText } from './embeddings';
import type { Course } from '@/lib/courses';

const COURSE_EMBEDDINGS_COLLECTION = 'course_embeddings';

export interface CourseEmbedding {
  courseId: string;
  courseCode: string;
  title: string;
  $vector: number[];
  updatedAt: Date;
}

export async function generateAndStoreCourseEmbedding(course: Course): Promise<void> {
  const text = createCourseText({
    title: course.title,
    description: course.description,
    code: course.code,
    tags: course.tags,
    learningOutcomes: course.Learning_outcomes,
  });

  const embedding = await generateEmbedding(text);

  await adminDb.collection(COURSE_EMBEDDINGS_COLLECTION).doc(course.id).set({
    courseId: course.id,
    courseCode: course.code || '',
    title: course.title,
    $vector: embedding,
    updatedAt: new Date(),
  });
}

export async function findSimilarCourses(
  query: string,
  topK: number = 15
): Promise<{ courseId: string; courseCode: string; title: string; similarity: number }[]> {
  const queryEmbedding = await generateEmbedding(query);

  const results = await adminDb.collection(COURSE_EMBEDDINGS_COLLECTION)
    .select('courseId', 'courseCode', 'title', '$vector')
    .limit(topK * 3)
    .get();

  if (results.empty) {
    return [];
  }

  const scored: { courseId: string; courseCode: string; title: string; similarity: number }[] = [];

  for (const doc of results.docs) {
    const data = doc.data() as CourseEmbedding;
    if (data.$vector && Array.isArray(data.$vector)) {
      const similarity = cosineSimilarity(queryEmbedding, data.$vector);
      scored.push({
        courseId: data.courseId,
        courseCode: data.courseCode,
        title: data.title,
        similarity,
      });
    }
  }

  scored.sort((a, b) => b.similarity - a.similarity);
  return scored.slice(0, topK);
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export async function getCourseEmbedding(courseId: string): Promise<CourseEmbedding | null> {
  const doc = await adminDb.collection(COURSE_EMBEDDINGS_COLLECTION).doc(courseId).get();
  if (!doc.exists) return null;
  return doc.data() as CourseEmbedding;
}

export async function deleteCourseEmbedding(courseId: string): Promise<void> {
  await adminDb.collection(COURSE_EMBEDDINGS_COLLECTION).doc(courseId).delete();
}

export async function getEmbeddingCount(): Promise<number> {
  const snapshot = await adminDb.collection(COURSE_EMBEDDINGS_COLLECTION).count().get();
  return snapshot.data().count || 0;
}
