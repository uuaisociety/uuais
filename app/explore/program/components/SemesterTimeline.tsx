"use client";

import { ProgramSemester, ProgramCourse } from "@/lib/types/program";
import { BookOpen, GraduationCap, Clock } from "lucide-react";
import Link from "next/link";

interface SemesterTimelineProps {
  semesters: ProgramSemester[];
}

export function SemesterTimeline({ semesters }: SemesterTimelineProps) {
  return (
    <div className="space-y-6">
      {semesters.map((semester) => (
        <div
          key={semester.number}
          className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
        >
          {/* Semester Header */}
          <div className="bg-gray-50 dark:bg-gray-900/50 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#990000]/10 rounded-lg">
                <GraduationCap className="h-5 w-5 text-[#990000]" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Semester {semester.number}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {getSemesterTotalCredits(semester)} credits
                </p>
              </div>
            </div>
          </div>

          {/* Periods */}
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {semester.periods.map((period) => (
              <div key={period.number} className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <h4 className="text-sm font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wide">
                    Period {period.number}
                  </h4>
                  <span className="text-sm text-gray-400">
                    ({period.courses.reduce((sum, c) => sum + c.credits, 0)} credits)
                  </span>
                </div>

                {period.courses.length === 0 ? (
                  <p className="text-sm text-gray-400 italic">No courses scheduled</p>
                ) : (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {period.courses.map((course) => (
                      <CourseCard key={course.code} course={course} />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function CourseCard({ course }: { course: ProgramCourse }) {
  return (
    <Link
      href={`/explore/${course.code}`}
      className={`no-underline group block relative p-4 rounded-lg border-2 transition-all duration-200 hover:shadow-md ${
        course.isMandatory
          ? "border-red-100 dark:border-red-900/30 bg-red-50/50 dark:bg-red-900/10 hover:border-red-200 dark:hover:border-red-800"
          : "border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 hover:border-gray-200 dark:hover:border-gray-600"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <BookOpen className="h-4 w-4 text-gray-400 shrink-0" />
            <span className="text-xs font-mono text-gray-500 dark:text-gray-400">
              {course.code}
            </span>
          </div>
          <h5 className="font-medium text-gray-900 dark:text-white text-sm leading-tight mb-2 line-clamp-2">
            {course.title}
          </h5>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
              {course.credits} credits
            </span>
            {course.isMandatory && (
              <span className="text-xs px-2 py-0.5 bg-[#990000]/10 text-[#990000] rounded-full font-medium">
                Required
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Field of Study Tag */}
      {course.fieldOfStudy && course.fieldOfStudy.length > 0 && (
        <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {course.fieldOfStudy[0]}
          </span>
        </div>
      )}
    </Link>
  );
}

function getSemesterTotalCredits(semester: ProgramSemester): number {
  return semester.periods.reduce(
    (sum, period) =>
      sum + period.courses.reduce((courseSum, course) => courseSum + course.credits, 0),
    0
  );
}
