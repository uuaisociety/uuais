import { fetchCourseById } from "@/lib/courses";
import CourseDetailClient from "@/components/courses/CourseDetailClient";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { ArrowLeft } from "lucide-react";

export default async function ExploreDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!id) {
    return notFound()
  }
  const course = await fetchCourseById(id);

  if (!course) {
    notFound();
  }
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-24 pb-12 transition-colors duration-300">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      <Link href="/explore">
        <Button variant="outline" className="mb-8" icon={ArrowLeft}>
          Back to Courses
        </Button>
      </Link>
        <CourseDetailClient course={course} hrefBase="/explore" />
      </div>
    </div>
  );
}
