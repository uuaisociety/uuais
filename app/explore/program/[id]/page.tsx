"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { getProgramById, getAllCoursesInProgram } from "@/lib/program/programs";
import { Program, ProgramCourse } from "@/lib/types/program";
import { SemesterTimeline } from "../components/SemesterTimeline";
import { ProgressTracker } from "../components/ProgressTracker";
import { TrackOverview } from "../components/TrackOverview";

export default function ProgramOverviewPage() {
  const params = useParams();
  const programId = params.id as string;

  const [program, setProgram] = useState<Program | null>(null);
  const [allCourses, setAllCourses] = useState<ProgramCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const prog = await getProgramById(programId);
      if (prog) {
        setProgram(prog);
        const courses = await getAllCoursesInProgram(prog);
        setAllCourses(courses);
      } else {
        setError("Program not found");
      }
    } catch (err) {
      setError("Failed to load program data");
      console.error("Error loading program:", err);
    } finally {
      setLoading(false);
    }
  }, [programId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetching pattern
    loadData();
  }, [loadData]);

  // Skeleton loading state
  if (loading) {
    return (
      <div className="space-y-8 animate-pulse">
        {/* Progress Tracker Skeleton */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
          <div className="grid md:grid-cols-3 gap-4 mb-6">
            <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
          </div>
          <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
        {/* Tracks Skeleton */}
        <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
        {/* Semester Timeline Skeleton */}
        <div className="space-y-4">
          <div className="h-8 w-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="h-96 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
        </div>
        {/* Stats Skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error || !program) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          {error || "Program not found"}
        </h2>
        <p className="text-gray-600 dark:text-gray-300">
          Please try again later or select a different program.
        </p>
      </div>
    );
  }

  const mandatoryCourses = allCourses.filter((c) => c.isMandatory);
  const electiveCourses = allCourses.filter((c) => !c.isMandatory);
  const mandatoryCredits = mandatoryCourses.reduce((sum, c) => sum + c.credits, 0);

  return (
    <div className="space-y-8">
      {/* Progress Overview */}
      <ProgressTracker
        totalCredits={program.credits}
        mandatoryCredits={mandatoryCredits}
        earnedCredits={0}
        completedCourses={[]}
        allCourses={allCourses}
      />

      {/* Tracks Overview */}
      <TrackOverview tracks={program.tracks} programId={programId} />

      {/* Semester Timeline */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          Program Timeline
        </h2>
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          Explore courses by semester and period. Click on any course to view details and prerequisites.
        </p>
        <SemesterTimeline semesters={program.semesters} />
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-3xl font-bold text-red-800 dark:text-red-600">{allCourses.length}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Total Courses</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-3xl font-bold text-red-800 dark:text-red-600">{mandatoryCourses.length}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Mandatory</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-3xl font-bold text-red-800 dark:text-red-600">{electiveCourses.length}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Electives</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-3xl font-bold text-red-800 dark:text-red-600">{program.tracks.length - 1}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Tracks</div>
        </div>
      </div>
    </div>
  );
}
