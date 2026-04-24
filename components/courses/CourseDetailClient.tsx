"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Tag } from "@/components/ui/Tag";
import { Button } from "@/components/ui/Button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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
  const hasKnownCredits = typeof course.credits === "number" && Number.isFinite(course.credits);
  const overviewFacts = [
    course.level ? { label: "Level", value: course.level } : null,
    hasKnownCredits ? { label: "Credits", value: `${course.credits} credits` } : null,
    course.language_of_instruction ? { label: "Language", value: course.language_of_instruction } : null,
    course.location ? { label: "Location", value: course.location } : null,
    course.study_period ? { label: "Study Period", value: course.study_period } : null,
    course.pace_of_study ? { label: "Pace of Study", value: course.pace_of_study } : null,
    course.teaching_form ? { label: "Teaching Form", value: course.teaching_form } : null,
    course.instructional_time ? { label: "Instructional Time", value: course.instructional_time } : null,
    course.application_code ? { label: "Application Code", value: course.application_code } : null,
    course.application_deadline ? { label: "Application Deadline", value: course.application_deadline } : null,
    course.selection ? { label: "Selection", value: course.selection } : null,
    course.fees
      ? {
          label: "Fees",
          value: course.fees,
          hint: "Tuition fees typically apply to students from outside the EU, EEA, or Switzerland.",
        }
      : null,
  ].filter((fact): fact is { label: string; value: string; hint?: string } => Boolean(fact));
  const resourceLinks = [
    course.link ? { label: "Course Page", href: course.link } : null,
    course.reading_list_link ? { label: "Reading List", href: course.reading_list_link } : null,
    course.syllabus_link ? { label: "Syllabus", href: course.syllabus_link } : null,
  ].filter((link): link is { label: string; href: string } => Boolean(link));
  const textSections = [
    course.about_blurb && course.about_blurb !== course.description
      ? { label: "About This Course", value: course.about_blurb }
      : null,
    course.instruction ? { label: "Instruction", value: course.instruction } : null,
    course.assessment ? { label: "Assessment", value: course.assessment } : null,
    course.syllabus && course.syllabus !== course.syllabus_link
      ? { label: "Syllabus Notes", value: course.syllabus }
      : null,
  ].filter((section): section is { label: string; value: string } => Boolean(section));
  const linkedPrerequisites = (course.prerequisites || []).filter(Boolean);
  const linkedDependents = (course.prerequisite_of || []).filter(Boolean);
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

  useEffect(() => {
    let isMounted = true;

    if (userLoading || !user) {
      return () => {
        isMounted = false;
      };
    }

    void (async () => {
      try {
        const favorited = await isCourseFavorited(user.uid, course.id);
        if (isMounted) {
          setIsFavorited(favorited);
        }
      } catch (e) {
        console.error("Failed to check favorite status:", e);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [course.id, user, userLoading]);

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
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{course.title} - {course.id}</h1>
            <a href={course.link || `https://uu.se/en/study/course?query=${course.id}`} target="_blank" rel="noopener noreferrer" className="hover:underline block mt-1 text-sm text-blue-500 dark:text-blue-400">
              View uu.se course page
            </a>
          </div>
          <div className="flex items-center gap-3">
            {!userLoading && user && (
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
        <p className="text-gray-700 dark:text-gray-300 mb-6">{course.description}</p>

        {overviewFacts.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-6">
            {overviewFacts.map((fact) => (
              <div
                key={fact.label}
                className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 p-4"
              >
                <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  <span>{fact.label}</span>
                  {fact.hint && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-gray-400 text-[10px] font-bold text-gray-500 hover:border-[#990000] hover:text-[#990000]"
                          aria-label={`More information about ${fact.label}`}
                        >
                          ?
                        </button>
                      </TooltipTrigger>
                      <TooltipContent sideOffset={6} className="max-w-xs">
                        {fact.hint}
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
                <div className="mt-1 text-sm text-gray-900 dark:text-white">{fact.value}</div>
              </div>
            ))}
          </div>
        )}

        {resourceLinks.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Resources</h3>
            <div className="flex flex-wrap gap-3">
              {resourceLinks.map((resource) => (
                <a
                  key={resource.label}
                  href={resource.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:border-[#990000] hover:text-[#990000] transition-colors"
                >
                  {resource.label}
                </a>
              ))}
            </div>
          </div>
        )}

        {textSections.length > 0 && (
          <div className="space-y-5 mb-6">
            {textSections.map((section) => (
              <div key={section.label}>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">{section.label}</h3>
                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">{section.value}</p>
              </div>
            ))}
          </div>
        )}

        {(linkedPrerequisites.length > 0 || linkedDependents.length > 0) && (
          <div className="grid gap-4 md:grid-cols-2 mb-6">
            {linkedPrerequisites.length > 0 && (
              <div className="rounded-lg border border-blue-200 dark:border-blue-900/50 bg-blue-50/70 dark:bg-blue-950/20 p-4">
                <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-3">Prerequisite Courses</h3>
                <div className="flex flex-wrap gap-2">
                  {linkedPrerequisites.map((courseId) => (
                    <Link
                      key={courseId}
                      href={`${hrefBase}/${courseId}`}
                      className="rounded-full border border-blue-200 dark:border-blue-800 px-3 py-1 text-sm text-blue-800 dark:text-blue-200 hover:border-blue-500 transition-colors"
                    >
                      {courseId}
                    </Link>
                  ))}
                </div>
              </div>
            )}
            {linkedDependents.length > 0 && (
              <div className="rounded-lg border border-green-200 dark:border-green-900/50 bg-green-50/70 dark:bg-green-950/20 p-4">
                <h3 className="text-sm font-semibold text-green-900 dark:text-green-200 mb-3">Courses That Build On This</h3>
                <div className="flex flex-wrap gap-2">
                  {linkedDependents.map((courseId) => (
                    <Link
                      key={courseId}
                      href={`${hrefBase}/${courseId}`}
                      className="rounded-full border border-green-200 dark:border-green-800 px-3 py-1 text-sm text-green-800 dark:text-green-200 hover:border-green-500 transition-colors"
                    >
                      {courseId}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {course.tags.map(t => <Tag key={t} className="bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">{t}</Tag>)}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold mb-3">Connections</h2>
        <CourseConnectionsFlow focus={course} hrefBase={hrefBase} height={520} />
        <div className="mt-4 flex flex-wrap gap-3 text-xs text-gray-600 dark:text-gray-300">
          <div className="inline-flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
            Prerequisites
          </div>
          <div className="inline-flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
            Courses that require this
          </div>
          <div className="inline-flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-slate-400" />
            Related courses
          </div>
        </div>
      </div>
    </div>
  );
}
