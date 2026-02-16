import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase-client";
import { CourseFavorite } from "@/types";

export const getUserFavorites = async (userId: string): Promise<CourseFavorite[]> => {
  const favoritesRef = collection(db, "favorites", userId, "courses");
  const snapshot = await getDocs(favoritesRef);
  return snapshot.docs.map((docSnap) => {
    const data = docSnap.data();
    return {
      courseId: docSnap.id,
      userId: data.userId,
      createdAt: data.createdAt?.toDate?.() ? data.createdAt.toDate().toISOString() : data.createdAt,
    } as CourseFavorite;
  });
};

export const isCourseFavorited = async (userId: string, courseId: string): Promise<boolean> => {
  const favoriteRef = doc(db, "favorites", userId, "courses", courseId);
  const favoriteSnap = await getDoc(favoriteRef);
  return favoriteSnap.exists();
};

export const addToFavorites = async (userId: string, courseId: string): Promise<void> => {
  const favoriteRef = doc(db, "favorites", userId, "courses", courseId);
  await setDoc(favoriteRef, {
    userId,
    createdAt: serverTimestamp(),
  });
};

export const removeFromFavorites = async (userId: string, courseId: string): Promise<void> => {
  const favoriteRef = doc(db, "favorites", userId, "courses", courseId);
  await deleteDoc(favoriteRef);
};

export const toggleFavorite = async (userId: string, courseId: string): Promise<boolean> => {
  const isFavorited = await isCourseFavorited(userId, courseId);
  if (isFavorited) {
    await removeFromFavorites(userId, courseId);
    return false;
  } else {
    await addToFavorites(userId, courseId);
    return true;
  }
};
