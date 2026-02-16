"use client";

import { useState, useEffect, useCallback } from "react";
import { Tag } from "@/components/ui/Tag";
import { Button } from "@/components/ui/Button";
import { Heart } from "lucide-react";
import type { Course } from "@/lib/courses";
import CourseConnectionsFlow from "./CourseConnectionsFlow";
import { auth } from "@/lib/firebase-client";
import { onAuthStateChanged } from "firebase/auth";
import { isCourseFavorited, toggleFavorite } from "@/lib/firestore/favorites";

type Props = { course: Course; all: Course[]; hrefBase?: string };

export default function CourseDetailClient({ course, all, hrefBase = "/explore" }: Props) {
  const [isFavorited, setIsFavorited] = useState(false);
  const [user, setUser] = useState<{ uid: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u ? { uid: u.uid } : null));
    return () => unsub();
  }, []);

  const checkFavoriteStatus = useCallback(async () => {
    if (!user) return;
    try {
      const favorited = await isCourseFavorited(user.uid, course.id);
      setIsFavorited(favorited);
    } catch (e) {
      console.error("Failed to check favorite status:", e);
    }
  }, [user, course.id]);

  useEffect(() => {
    if (user) {
      checkFavoriteStatus();
    }
  }, [user, course.id, checkFavoriteStatus]);

  const handleToggleFavorite = async () => {
    if (!user || isLoading) return;
    setIsLoading(true);
    try {
      const newStatus = await toggleFavorite(user.uid, course.id);
      setIsFavorited(newStatus);
    } catch (e) {
      console.error("Failed to toggle favorite:", e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm text-gray-500 dark:text-gray-400">{course.code}</div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{course.title}</h1>
            <a href={course.link} target="_blank" rel="noopener noreferrer">View uu.se course page</a>
          </div>
          {user && (
            <Button
              variant="outline"
              onClick={handleToggleFavorite}
              disabled={isLoading}
              className={isFavorited ? "text-red-500 border-red-500" : ""}
            >
              <Heart className={`h-5 w-5 mr-2 ${isFavorited ? "fill-current" : ""}`} />
              {isFavorited ? "Favorited" : "Add to Favorites"}
            </Button>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-semibold mb-3">Overview</h2>
        <p className="text-gray-700 dark:text-gray-300 mb-4">{course.description}</p>
        <div className="mb-4"><span className="font-medium"><b>Credits:</b></span> {course.tags.find(t => t.toLowerCase().includes("credits")) ?? "5 credits"}</div>
        <div className="flex flex-wrap gap-2">
          {course.tags.map(t => <Tag key={t} className="bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">{t}</Tag>)}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold mb-3">Connections</h2>
        <CourseConnectionsFlow focus={course} all={all} hrefBase={hrefBase} />
        <div className="mt-2 text-xs text-gray-600 dark:text-gray-300">Blue: prerequisites · Green: courses needing this · Gray: related</div>
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-semibold mb-4">Student Feedback (Mock)</h2>
        <ul className="space-y-4">
          <li className="p-4 rounded-md bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-sm">
            &quot;Great introduction, hands-on assignments helped a lot.&quot; — 4.5/5
          </li>
          <li className="p-4 rounded-md bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-sm">
            &quot;Challenging but rewarding, recommend basic Python beforehand.&quot; — 4/5
          </li>
        </ul>
      </div>
    </div>
  );
}
