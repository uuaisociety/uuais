"use client";

import { useState, useEffect, useCallback } from "react";
import { Tag } from "@/components/ui/Tag";
import { Button } from "@/components/ui/Button";
import { Heart } from "lucide-react";
import type { Course } from "@/lib/courses";
import CourseConnectionsFlow from "./CourseConnectionsFlow";
//import EligibilityBadge from "./EligibilityBadge";
import { isCourseFavorited, toggleFavorite } from "@/lib/firestore/favorites";
import { useAdmin } from "@/hooks/useAdmin";
//import { evaluateEligibility, buildProfileFromTranscript, type EligibilityResult } from "@/lib/eligibility/engine";
//import { type EligibilityResult } from "@/lib/eligibility/engine";
type Props = { course: Course; hrefBase?: string };

export default function CourseDetailClient({ course, hrefBase = "/explore" }: Props) {
  const [isFavorited, setIsFavorited] = useState(false);
  const { user, loading: userLoading } = useAdmin();
  
  const [isLoading, setIsLoading] = useState(false);
  // const [eligibilityResult, setEligibilityResult] = useState<EligibilityResult | null>(null);
  // const checkTranscriptAndEligibility = async () => {
  //   if (!course.structured_requirements) return;
  //   try {
  //     const userObj = auth.currentUser;
  //     if (!userObj) return;
  //     //const token = await userObj.getIdToken();
  //     // To really load the transcript, we need an API endpoint to fetch it.
  //     // But we can also do it server-side or via a new simple client-side fetch.
  //     // For now, if we have transcript data loaded (or passed from an upload), evaluate it.
  //   } catch (e) {
  //     console.error("Failed to check eligibility:", e);
  //   }
  // };

  // const handleTranscriptDataLoaded = (data: any) => {
  //   if (!course.structured_requirements) return;
  //   const profile = buildProfileFromTranscript(data.entries);
  //   const result = evaluateEligibility(course.structured_requirements, profile);
  //   setEligibilityResult(result);
  // };

  // const handleTranscriptDeleted = () => {
  //   setEligibilityResult(null);
  // };

  const checkFavoriteStatus = useCallback(async () => {
    if (userLoading || !user) return;
    try {
      const favorited = await isCourseFavorited(user.uid, course.id);
      setIsFavorited(favorited);
    } catch (e) {
      console.error("Failed to check favorite status:", e);
    }
  }, [user, course.id, userLoading]);

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

  if (userLoading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <div>Not authorized</div>;
  }
  console.log("course: ", course);
  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm text-gray-500 dark:text-gray-400">{course.code}</div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{course.title}</h1>
            <a href={course.link || `https://uu.se/en/study/course?query=${course.id}`} target="_blank" rel="noopener noreferrer" className="hover:underline block mt-1">View uu.se course page</a>
          </div>
          <div className="flex items-center gap-3">
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
      </div>

      {/* {user && course.structured_requirements && (
        <EligibilityBadge
          result={eligibilityResult}
          onUploadClick={() => document.querySelector<HTMLButtonElement>('button:has(.lucide-upload)')?.click()}
        />
      )} */}

      {/* Raw entry requirements for context */}
      {course.entry_requirements && !course.structured_requirements && (
        <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg border border-amber-200 dark:border-amber-800">
          <h2 className="text-sm font-semibold text-amber-800 dark:text-amber-400 mb-1">Entry Requirements</h2>
          <p className="text-sm text-amber-700 dark:text-amber-500">{course.entry_requirements}</p>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-semibold mb-3">Overview</h2>
        <p className="text-gray-700 dark:text-gray-300 mb-4">{course.description}</p>
        <div className="mb-4"><span className="font-medium"><b>Credits:</b></span> {course.credits ? `${course.credits} credits` : "Unknown"}</div>
        <div className="flex flex-wrap gap-2">
          {course.tags.map(t => <Tag key={t} className="bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">{t}</Tag>)}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold mb-3">Connections</h2>
        <CourseConnectionsFlow focus={course} hrefBase={hrefBase} />
        <div className="mt-2 text-xs text-gray-600 dark:text-gray-300">Blue: prerequisites · Green: courses needing this · Gray: related</div>
      </div>
    </div>
  );
}
