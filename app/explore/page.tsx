"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchCourses, type Course } from "@/lib/courses";
import RagChat from "@/components/common/RagChat";
import CourseCard from "@/components/courses/CourseCard";
import { updatePageMeta } from "@/utils/seo";

export default function ExplorePage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    updatePageMeta(
      "Explore Courses",
      "Discover, search, and compare all Uppsala University courses"
    );
    fetchCourses().then(setCourses);
  }, []);

  const results = useMemo(() => {
    // If no query get 3 random courses
    if (!query) return courses.sort(() => Math.random() - 0.5).slice(0, 3);
    // Mock AI search by local filter
    return courses.filter((c) =>
      c.title.toLowerCase().includes(query.toLowerCase()) ||
      c.description.toLowerCase().includes(query.toLowerCase()) ||
      c.tags.some((t) => t.toLowerCase().includes(query.toLowerCase())) ||
      (c.code || '').toLowerCase().includes(query.toLowerCase()) ||
      (c.link || '').toLowerCase().includes(query.toLowerCase())
    ).slice(0, 10);
  }, [courses, query]);

  // const recommended = useMemo(() => courses.slice(0, 3), [courses]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-24 pb-12 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-3">UUAIS Course Navigator</h1>
          <p className="text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">Search all Uppsala University courses with natural language and explore their connections. Remember AI can and will make mistakes, double check information!</p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-10">
          <RagChat onSearch={setQuery} placeholder="Ask about courses, e.g. ‘beginner statistics with labs’" />
        </div>

        <div className="mt-10">
          <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">Results</h2>
          {results.length === 0 ? (
            <div className="text-center py-12 text-gray-600 dark:text-gray-300">No courses match your query.</div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {results.map((c) => (
                <CourseCard key={c.id} course={c} hrefBase="/explore" />
              ))}
            </div>
          )}
        </div>

        {/* <div className="mt-12">
          <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">Recommended</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {recommended.map((c) => (
              <CourseCard key={c.id} course={c} hrefBase="/explore" />
            ))}
          </div>
        </div> */}
      </div>
    </div>
  );
}
