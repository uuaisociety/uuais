import CourseDetailClient from "@/components/courses/CourseDetailClient";
import CourseUnavailable from "@/components/courses/CourseUnavailable";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import { getProgram } from "@/lib/programs";
import { programDisplayNames, programReturnPath } from "@/lib/programs/format";

/**
 * Dynamic import so a failed admin SDK init degrades gracefully instead of throwing during
 * module evaluation, the same reason lib/server-data.ts loads it this way.
 */
async function fetchCourseById(id: string) {
  const { fetchCourseById: fetch } = await import("@/lib/courses");
  return fetch(id);
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  if (!id) return { title: "Course Detail" };
  try {
    const course = await fetchCourseById(id);
    if (!course) return { title: "Course Detail" };
    return {
      title: course.title || course.code || "Course Detail",
      description: course.description?.slice(0, 160) || "",
    };
  } catch {
    return { title: "Course Detail" };
  }
}

/**
 * Where the reader came from, when they came from a programme map: returning them to the flat
 * course list would drop them out of the degree they were reading. Only a programme path is
 * honoured, so the parameter cannot be used to bounce anyone off-site.
 */
async function resolveReturn(
  searchParams?: Promise<Record<string, string | string[] | undefined>>
): Promise<{ href: string; label: string } | null> {
  if (!searchParams) return null;
  const raw = (await searchParams).from;
  const href = programReturnPath(typeof raw === "string" ? raw : null);
  if (!href) return null;

  const slug = href.slice("/programs/".length).split("?")[0];
  const program = getProgram(slug);
  if (!program) return { href, label: "programme" };
  return {
    href,
    label: programDisplayNames(program.nameSv, program.nameEn).primary,
  };
}

export default async function ExploreDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const from = await resolveReturn(searchParams);
  if (!id) {
    return notFound()
  }
  // A lookup that fails — Firestore unreachable, or no server credentials — leaves the reader in
  // the same position as a course we never scraped, so it gets the same page rather than a crash.
  let course;
  try {
    course = await fetchCourseById(id);
  } catch (error) {
    console.error("Course lookup failed:", error);
  }

  // A course we link to but have never scraped is a gap in our data, not a bad URL:
  // 404ing it strands the reader on ~1 in 5 of the links the programme maps generate.
  if (!course) {
    return <CourseUnavailable code={id} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-24 pb-12 transition-colors duration-300">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      <Link href={from?.href ?? "/explore"}>
        <Button variant="outline" className="mb-8" icon={ArrowLeft}>
          {from ? `Back to ${from.label}` : "Back to Courses"}
        </Button>
      </Link>
        <CourseDetailClient course={course} hrefBase="/explore" />
      </div>
    </div>
  );
}
