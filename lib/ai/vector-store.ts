import { adminDb } from '@/lib/firebase-admin';
import { generateEmbedding, createCourseText } from './embeddings';
import type { Course } from '@/lib/courses';
import { FieldValue } from 'firebase-admin/firestore';

const COURSES_COLLECTION = 'courses';

export async function generateAndStoreCourseEmbedding(course: Course): Promise<void> {
  const text = createCourseText({
    title: course.title,
    description: course.description,
    code: course.code,
    tags: course.tags,
    learningOutcomes: course.Learning_outcomes,
  });

  const embedding = await generateEmbedding(text);

  await adminDb.collection(COURSES_COLLECTION).doc(course.id).update({
    embedding: FieldValue.vector(embedding)
  });
}

export async function findSimilarCourses(
  query: string,
  topK: number = 25
): Promise<{ courseId: string; courseCode: string; title: string; description: string; tags: string[]; learningOutcomes: string; similarity: number }[]> {
  const queryEmbedding = await generateEmbedding(query);

  // Use native Firestore vector search with findNearest
  const coll = adminDb.collection(COURSES_COLLECTION);
  
  // Note: Requires a single-field vector index on 'embedding' field
  const vectorQuery = coll.findNearest({
    vectorField: 'embedding',
    queryVector: queryEmbedding,
    limit: topK,
    distanceMeasure: 'COSINE',
    distanceResultField: 'vector_distance'
  });

  const snapshot = await vectorQuery.get();
  if (snapshot.empty) {
    return [];
  }

  const results: { courseId: string; courseCode: string; title: string; description: string; tags: string[]; learningOutcomes: string; similarity: number }[] = [];

  for (const doc of snapshot.docs) {
    const data = doc.data();
    
    // COSINE distance: 0 = identical vectors, 2 = opposite vectors
    // Convert to similarity score where 1 = identical, 0 = completely different
    const distance = data.vector_distance as number;
    const similarity = Math.max(0, 1 - (distance / 2));
    
    results.push({
      courseId: doc.id,
      courseCode: (data.code as string) || '',
      title: (data.Course_name as string) || (data.title as string) || '',
      description: (data.course_content as string) || (data.description as string) || '',
      tags: Array.isArray(data.tags) ? data.tags : [],
      learningOutcomes: (data.Learning_outcomes as string) || (data.learning_outcomes as string) || '',
      similarity,
    });
  }
  
  // console.log('Vector search results:', results.map(r => ({ id: r.courseId, title: r.title, similarity: r.similarity })));
  return results;
}

export async function getCourseEmbedding(courseId: string): Promise<number[] | null> {
  const doc = await adminDb.collection(COURSES_COLLECTION).doc(courseId).get();
  if (!doc.exists) return null;
  const data = doc.data();
  if (!data?.embedding) return null;

  if (Array.isArray(data.embedding)) return data.embedding;
  if (typeof data.embedding.toArray === 'function') return data.embedding.toArray();
  return null;
}

export async function deleteCourseEmbedding(courseId: string): Promise<void> {
  await adminDb.collection(COURSES_COLLECTION).doc(courseId).update({
    embedding: FieldValue.delete()
  });
}

export async function getEmbeddingCount(): Promise<number> {
  const snapshot = await adminDb.collection(COURSES_COLLECTION)
    .where('embedding', '!=', null)
    .count()
    .get();
  return snapshot.data().count || 0;
}
