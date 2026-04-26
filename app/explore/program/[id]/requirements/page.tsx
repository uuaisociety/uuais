"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { getProgramById, getAllCoursesInProgram } from "@/lib/program/programs";
import { Program, ProgramCourse } from "@/lib/types/program";
import Link from "next/link";
import { Award, BookOpen, GraduationCap, CheckCircle2, Circle } from "lucide-react";

export default function RequirementsPage() {
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
        {/* Overview Skeleton */}
        <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
        {/* Mandatory Courses Skeleton */}
        <div className="h-96 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
        {/* Level Distribution Skeleton */}
        <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
        {/* Elective Courses Skeleton */}
        <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
        {/* Program Info Skeleton */}
        <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
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

  const totalMandatoryCredits = mandatoryCourses.reduce((sum, c) => sum + c.credits, 0);
  const totalElectiveCredits = electiveCourses.reduce((sum, c) => sum + c.credits, 0);

  return (
    <div className="space-y-8">
      {/* Overview */}
      <div className="bg-gradient-to-r from-[#990000]/10 to-red-50 dark:from-[#990000]/20 dark:to-red-900/10 rounded-xl p-6 border border-[#990000]/20">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Degree Requirements
        </h2>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="bg-white/80 dark:bg-gray-800/80 rounded-lg p-4">
            <GraduationCap className="h-6 w-6 text-[#990000] mb-2" />
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {program.credits}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-300">
              Total Credits Required
            </div>
          </div>
          <div className="bg-white/80 dark:bg-gray-800/80 rounded-lg p-4">
            <CheckCircle2 className="h-6 w-6 text-green-600 mb-2" />
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {totalMandatoryCredits}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-300">
              Mandatory Credits
            </div>
          </div>
          <div className="bg-white/80 dark:bg-gray-800/80 rounded-lg p-4">
            <Circle className="h-6 w-6 text-blue-600 mb-2" />
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {program.credits - totalMandatoryCredits}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-300">
              Elective Credits
            </div>
          </div>
        </div>
      </div>

      {/* Mandatory Courses */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <CheckCircle2 className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              Mandatory Courses
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {mandatoryCourses.length} courses • {totalMandatoryCredits} credits
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {mandatoryCourses.map((course) => (
            <CourseRequirementCard key={course.code} course={course} isRequired />
          ))}
        </div>
      </div>

      {/* Level Distribution */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <Award className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              Course Level Distribution
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Understanding course levels in your program
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-900 dark:text-white">
              First Cycle (Bachelor&apos;s Level)
            </h4>
            <div className="space-y-2">
              <LevelInfo
                level="G1N"
                name="First cycle, general"
                description="Introductory courses, no prerequisites"
              />
              <LevelInfo
                level="G1F"
                name="First cycle, in-depth"
                description="Some prior knowledge required"
              />
              <LevelInfo
                level="G2F"
                name="First cycle, specialized"
                description="Prerequisites required"
              />
            </div>
          </div>
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-900 dark:text-white">
              Second Cycle (Master&apos;s Level)
            </h4>
            <div className="space-y-2">
              <LevelInfo
                level="A1N"
                name="Second cycle, general"
                description="Master&apos;s level foundation"
              />
              <LevelInfo
                level="A1F"
                name="Second cycle, specialized"
                description="Advanced courses"
              />
              <LevelInfo
                level="A2E"
                name="Degree Project"
                description="Master&apos;s thesis"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Elective Courses Info */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <BookOpen className="h-6 w-6 text-purple-600" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              Elective Courses
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {electiveCourses.length} courses • {totalElectiveCredits} credits available
            </p>
          </div>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-100 dark:border-blue-800">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            Elective courses can be chosen from your specialization track or from other tracks
            to create a personalized curriculum. Consult your academic advisor to ensure your
            choices meet degree requirements.
          </p>
        </div>
      </div>

      {/* Program Info */}
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Program Information
        </h3>
        <dl className="grid md:grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-gray-500 dark:text-gray-400">Program Code</dt>
            <dd className="font-medium text-gray-900 dark:text-white">{program.code}</dd>
          </div>
          <div>
            <dt className="text-gray-500 dark:text-gray-400">Valid From</dt>
            <dd className="font-medium text-gray-900 dark:text-white">{program.validFrom}</dd>
          </div>
          <div>
            <dt className="text-gray-500 dark:text-gray-400">Finalized By</dt>
            <dd className="font-medium text-gray-900 dark:text-white">{program.finalizedBy}</dd>
          </div>
          <div>
            <dt className="text-gray-500 dark:text-gray-400">Registration Number</dt>
            <dd className="font-medium text-gray-900 dark:text-white">{program.registrationNumber}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}

function CourseRequirementCard({
  course,
  isRequired = false,
}: {
  course: {
    code: string;
    title: string;
    credits: number;
    fieldOfStudy?: string[];
  };
  isRequired?: boolean;
}) {
  return (
    <Link 
      href={`/explore/${course.code}`} 
      className="no-underline bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-red-500 dark:hover:border-red-600 transition-all duration-200 overflow-hidden"
    >
      <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 mb-1">
          <BookOpen className="h-3 w-3 text-gray-400 shrink-0" />
          <span className="text-xs font-mono text-gray-500 dark:text-gray-400">{course.code}</span>
          {isRequired && (
            <span className="ml-auto text-xs px-1.5 py-0.5 bg-[#990000]/10 text-[#990000] rounded">
              Required
            </span>
          )}
        </div>
        <h4 className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2 mb-1">
          {course.title}
        </h4>
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-600 dark:text-gray-400">{course.credits} credits</span>
          {course.fieldOfStudy && course.fieldOfStudy[0] && (
            <span className="text-xs text-gray-500 truncate max-w-[100px]">
              {course.fieldOfStudy[0].split(" ")[0]}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

function LevelInfo({
  level,
  name,
  description,
}: {
  level: string;
  name: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
      <span className="text-xs font-mono font-bold text-gray-500 dark:text-gray-400 bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">
        {level}
      </span>
      <div>
        <div className="font-medium text-sm text-gray-900 dark:text-white">{name}</div>
        <div className="text-xs text-gray-500 dark:text-gray-400">{description}</div>
      </div>
    </div>
  );
}
