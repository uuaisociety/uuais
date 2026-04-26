"use client";

import { useMemo } from "react";
import { ProgramCourse } from "@/lib/types/program";
import { CheckCircle2, Circle, Target, Award, BookOpen } from "lucide-react";

interface ProgressTrackerProps {
  totalCredits: number;
  mandatoryCredits: number;
  earnedCredits: number;
  completedCourses: string[];
  allCourses: ProgramCourse[];
}

export function ProgressTracker({
  totalCredits,
  mandatoryCredits,
  earnedCredits,
  completedCourses,
  allCourses,
}: ProgressTrackerProps) {
  const progress = useMemo(() => {
    const percentage = Math.round((earnedCredits / totalCredits) * 100);
    const mandatoryCompleted = allCourses.filter(
      (c) => c.isMandatory && completedCourses.includes(c.code)
    );
    const electiveCompleted = allCourses.filter(
      (c) => !c.isMandatory && completedCourses.includes(c.code)
    );

    return {
      percentage,
      mandatoryCount: mandatoryCompleted.length,
      totalMandatory: allCourses.filter((c) => c.isMandatory).length,
      electiveCount: electiveCompleted.length,
      totalElective: allCourses.filter((c) => !c.isMandatory).length,
    };
  }, [earnedCredits, totalCredits, completedCourses, allCourses]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-[#990000]/10 rounded-lg">
          <Target className="h-6 w-6 text-[#990000]" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Progress Tracker
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Track your completion of program requirements
          </p>
        </div>
      </div>

      {/* Main Progress Bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
            Total Progress
          </span>
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            {earnedCredits} / {totalCredits} credits ({progress.percentage}%)
          </span>
        </div>
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#990000] to-red-500 rounded-full transition-all duration-500"
            style={{ width: `${Math.max(progress.percentage, 2)}%` }}
          />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Award className="h-4 w-4 text-[#990000]" />
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
              Mandatory
            </span>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {progress.mandatoryCount}
            <span className="text-sm font-normal text-gray-500">/{progress.totalMandatory}</span>
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {mandatoryCredits} credits required
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <BookOpen className="h-4 w-4 text-blue-500" />
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
              Electives
            </span>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {progress.electiveCount}
            <span className="text-sm font-normal text-gray-500">/{progress.totalElective}</span>
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {totalCredits - mandatoryCredits} credits available
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
              Completed
            </span>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {completedCourses.length}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {earnedCredits} credits earned
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Circle className="h-4 w-4 text-gray-400" />
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
              Remaining
            </span>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {allCourses.length - completedCourses.length}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {totalCredits - earnedCredits} credits left
          </div>
        </div>
      </div>

      {/* Sign in prompt for tracking */}
      {/* {completedCourses.length === 0 && (
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            Sign in to track your completed courses and see your personalized progress.
          </p>
        </div>
      )} */}
    </div>
  );
}
