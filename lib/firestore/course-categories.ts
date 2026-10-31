import {
  collection,
  query,
  orderBy,
  getDocs,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase-client';
import { CourseCategory } from '@/types';

export const getUserCategories = async (
  userId: string,
): Promise<CourseCategory[]> => {
  const categoriesRef = collection(
    db,
    'course_categories',
    userId,
    'categories',
  );
  const qy = query(categoriesRef, orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(qy);
  return snapshot.docs.map((docSnap) => {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      userId: data.userId,
      name: data.name,
      color: data.color,
      createdAt: data.createdAt?.toDate?.()
        ? data.createdAt.toDate().toISOString()
        : data.createdAt,
      updatedAt: data.updatedAt?.toDate?.()
        ? data.updatedAt.toDate().toISOString()
        : data.updatedAt,
    } as CourseCategory;
  });
};

export const getCategoryById = async (
  userId: string,
  categoryId: string,
): Promise<CourseCategory | null> => {
  const categoryRef = doc(
    db,
    'course_categories',
    userId,
    'categories',
    categoryId,
  );
  const categorySnap = await getDoc(categoryRef);
  if (!categorySnap.exists()) return null;
  const data = categorySnap.data();
  return {
    id: categorySnap.id,
    userId: data.userId,
    name: data.name,
    color: data.color,
    createdAt: data.createdAt?.toDate?.()
      ? data.createdAt.toDate().toISOString()
      : data.createdAt,
    updatedAt: data.updatedAt?.toDate?.()
      ? data.updatedAt.toDate().toISOString()
      : data.updatedAt,
  } as CourseCategory;
};

export const createCategory = async (
  userId: string,
  name: string,
  color?: string,
): Promise<string> => {
  const categoriesRef = collection(
    db,
    'course_categories',
    userId,
    'categories',
  );
  // Prefixed with the owner's uid, which the security rules require.
  const categoryId = `${userId}_${crypto.randomUUID()}`;
  const categoryRef = doc(categoriesRef, categoryId);

  await setDoc(categoryRef, {
    userId,
    name,
    color: color || '#990000',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return categoryId;
};

export const updateCategory = async (
  userId: string,
  categoryId: string,
  updates: Partial<Pick<CourseCategory, 'name' | 'color'>>,
): Promise<void> => {
  const categoryRef = doc(
    db,
    'course_categories',
    userId,
    'categories',
    categoryId,
  );
  await setDoc(
    categoryRef,
    {
      ...updates,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
};

export const deleteCategory = async (
  userId: string,
  categoryId: string,
): Promise<void> => {
  const categoryRef = doc(
    db,
    'course_categories',
    userId,
    'categories',
    categoryId,
  );

  // Mappings first: the rules allow them only while the caller still owns the
  // category, so deleting the category first would orphan them.
  const categoryCoursesRef = collection(
    db,
    'category_courses',
    categoryId,
    'courses',
  );
  const snapshot = await getDocs(categoryCoursesRef);
  const deletePromises = snapshot.docs.map((docSnap) => deleteDoc(docSnap.ref));
  await Promise.all(deletePromises);

  await deleteDoc(categoryRef);
};

export const getCategoryCourses = async (
  categoryId: string,
): Promise<string[]> => {
  const categoryCoursesRef = collection(
    db,
    'category_courses',
    categoryId,
    'courses',
  );
  const snapshot = await getDocs(categoryCoursesRef);
  return snapshot.docs.map((docSnap) => docSnap.id);
};

export const addCourseToCategory = async (
  categoryId: string,
  courseId: string,
): Promise<void> => {
  const courseRef = doc(
    db,
    'category_courses',
    categoryId,
    'courses',
    courseId,
  );
  await setDoc(courseRef, { addedAt: serverTimestamp() });
};

export const removeCourseFromCategory = async (
  categoryId: string,
  courseId: string,
): Promise<void> => {
  const courseRef = doc(
    db,
    'category_courses',
    categoryId,
    'courses',
    courseId,
  );
  await deleteDoc(courseRef);
};

export const isCourseInCategory = async (
  categoryId: string,
  courseId: string,
): Promise<boolean> => {
  const courseRef = doc(
    db,
    'category_courses',
    categoryId,
    'courses',
    courseId,
  );
  const courseSnap = await getDoc(courseRef);
  return courseSnap.exists();
};
