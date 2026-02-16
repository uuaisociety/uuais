"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Tag } from "@/components/ui/Tag";
import { Heart } from "lucide-react";
import type { Course } from "@/lib/courses";
import { auth } from "@/lib/firebase-client";
import { onAuthStateChanged } from "firebase/auth";
import { isCourseFavorited, toggleFavorite } from "@/lib/firestore/favorites";

type Props = { course: Course; hrefBase?: string };

export default function CourseCard({ course, hrefBase = "/course" }: Props) {
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

  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
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
    <Card className="h-full hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
      <CardContent className="p-6 flex flex-col h-full">
        <div className="mb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              {course.level && (
                <span className="inline-block text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200 mb-1">
                  {course.level}
                </span>
              )}
              <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">{course.code}</div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-1">{course.title}</h3>
            </div>
            {user && (
              <Button
                onClick={handleToggleFavorite}
                disabled={isLoading}
                className={`p-2 rounded-full transition-colors transition-shadow bg-transparent border-none shadow-none ${
                  isFavorited
                    ? "text-red-500 hover:text-red-600"
                    : "text-gray-400 hover:text-red-500"
                }`}
                aria-label={isFavorited ? "Remove from favorites" : "Add to favorites"}
              >
                {/* Animated heart on click  */}
                <Heart className={`h-5 w-5 cursor-pointer 
                  bg-transparent border-none 
                  transition-colors duration-300 
                  hover:text-red-500 hover:fill-current 
                  ${isFavorited ? " text-red-500 fill-current" : ""}`} />
              </Button>
            )}
          </div>
        </div>
        <p className="text-gray-600 dark:text-gray-300 mb-4 line-clamp-3">{course.description}</p>
        <div className="flex flex-wrap gap-2 mb-6">
          {course.tags.map((t) => (
            <Tag key={t} className="bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">{t}</Tag>
          ))}
        </div>
        <div className="mt-auto flex items-center gap-2">
          <Link href={`${hrefBase}/${course.id}`} className="flex-1">
            <Button className="bg-[#990000] hover:bg-[#7f0000] text-white w-full">View Details</Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
