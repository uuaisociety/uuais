"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { getProgramById, getProgramCourseByCode } from "@/lib/program/programs";
import { Program, ProgramCourse, ProgramTrack } from "@/lib/types/program";
import Link from "next/link";
import { ArrowLeft, CheckCircle, Circle, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function TrackDetailPage() {
  const params = useParams();
  const programId = params.id as string;
  const trackId = params.trackId as string;

  const [program, setProgram] = useState<Program | null>(null);
  const [track, setTrack] = useState<ProgramTrack | null>(null);
  const [requiredCourses, setRequiredCourses] = useState<ProgramCourse[]>([]);
  const [electiveCourses, setElectiveCourses] = useState<ProgramCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const prog = await getProgramById(programId);
      if (!prog) {
        setError("Program not found");
        setLoading(false);
        return;
      }
      setProgram(prog);

      const foundTrack = prog.tracks.find((t) => t.id === trackId);
      if (!foundTrack) {
        setError("Track not found");
        setLoading(false);
        return;
      }
      setTrack(foundTrack);

      // Support both new and old property names
      const requiredIds = foundTrack.requiredCourseIds || foundTrack.requiredCourses || [];
      const electiveIds = foundTrack.electiveCourseIds || foundTrack.electiveCourses || [];
      
      const required = await Promise.all(
        requiredIds.map((id) => getProgramCourseByCode(prog, id))
      );
      setRequiredCourses(required.filter((c): c is ProgramCourse => c !== undefined));

      const electives = await Promise.all(
        electiveIds.map((id) => getProgramCourseByCode(prog, id))
      );
      setElectiveCourses(electives.filter((c): c is ProgramCourse => c !== undefined));
    } catch (err) {
      setError("Failed to load track data");
      console.error("Error loading track:", err);
    } finally {
      setLoading(false);
    }
  }, [programId, trackId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetching pattern
    loadData();
  }, [loadData]);

  // Skeleton loading state
  if (loading) {
    return (
      <div className="space-y-8 animate-pulse">
        {/* Header Skeleton */}
        <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
        {/* Stats Skeleton */}
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
          ))}
        </div>
        {/* Courses Skeleton */}
        <div className="space-y-4">
          <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="grid md:grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !program || !track) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          {error || "Track not found"}
        </h2>
        <p className="text-gray-600 dark:text-gray-300">
          Please try again later or select a different track.
        </p>
      </div>
    );
  }

  const totalTrackCredits = [...requiredCourses, ...electiveCourses].reduce(
    (sum, c) => sum + c.credits,
    0
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 justify-start align-middle mb-6">
            <Link href={`/explore/program/${programId}/tracks`}>
              <Button variant="outline" size="sm" icon={ArrowLeft} className={`align-middle mb-2`}>
                Back to Tracks
              </Button>
            </Link>
            <div
              className="inline-block px-3 py-1 rounded-full text-sm font-medium mb-2 align-middle"
              style={{ backgroundColor: `${track.color}20`, color: track.color }}
            >
              Specialization Track
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {track.name}
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2 max-w-2xl">
            {track.description}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {requiredCourses.length}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">Required Courses</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {electiveCourses.length}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">Elective Options</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {totalTrackCredits}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">Total Credits</div>
        </div>
      </div>

      {/* Required Courses */}
      {requiredCourses.length > 0 && (
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Required Courses
          </h2>
          <div className="grid md:grid-cols-2 gap-3">
            {requiredCourses.map((course) => (
              <CourseCard key={course.code} course={course} trackColor={track.color} />
            ))}
          </div>
        </div>
      )}

      {/* Elective Courses */}
      {electiveCourses.length > 0 && (
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Circle className="h-5 w-5 text-blue-500" />
            Elective Options
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            Choose from these courses to customize your track. Check with your advisor for specific requirements.
          </p>
          <div className="grid md:grid-cols-2 gap-3">
            {electiveCourses.map((course) => (
              <CourseCard course={course} trackColor={track.color} isElective />
            ))}
          </div>
        </div>
      )}

      {/* All Program Context */}
      <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg border-2 border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Full Program Context
        </h3>
        <p className="text-gray-600 dark:text-gray-300 text-sm">
          These track courses are part of the larger Engineering Physics program.
          View the complete program to understand how these courses fit into your overall curriculum.
        </p>
        <Link href={`/explore/program/${programId}`}>
          <Button variant="outline" className="mt-4">
            View Full Program
          </Button>
        </Link>
      </div>
    </div>
  );
}

function CourseCard({
  course,
  trackColor,
  isElective = false,
}: {
  course: {
    code: string;
    title: string;
    credits: number;
    isMandatory: boolean;
    fieldOfStudy?: string[];
  };
  trackColor: string;
  isElective?: boolean;
}) {
  return (
    <Link
      key={course.code}
      href={`/explore/${course.code}`}
      className="no-underline bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 transition-all duration-200 overflow-hidden"
    >
    <div
      className={`p-4 rounded-lg border-2 transition-all duration-200 ${
        isElective
          ? "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
          : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-1 h-full min-h-[60px] rounded-full shrink-0"
          style={{ backgroundColor: trackColor }}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <BookOpen className="h-4 w-4 text-gray-400 shrink-0" />
            <span className="text-xs font-mono text-gray-500 dark:text-gray-400">
              {course.code}
            </span>
          </div>
          <h4 className="font-medium text-gray-900 dark:text-white mb-1">{course.title}</h4>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-300">
              {course.credits} credits
            </span>
            {!isElective && course.isMandatory && (
              <span
                className="text-xs px-2 py-0.5 rounded-full"
                style={{ backgroundColor: `${trackColor}20`, color: trackColor }}
              >
                Required
              </span>
            )}
            {isElective && (
              <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full">
                Elective
              </span>
            )}
          </div>
          {course.fieldOfStudy && course.fieldOfStudy[0] && (
            <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              {course.fieldOfStudy[0]}
            </div>
          )}
        </div>
      </div>
    </div>
    </Link>
  );
}
