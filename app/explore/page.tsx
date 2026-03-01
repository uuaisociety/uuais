"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchCoursesClient } from "@/lib/firestore/courses";
import type { Course } from "@/lib/courses";
import RagChat from "@/components/common/RagChat";
import CourseCard from "@/components/courses/CourseCard";
import EmbeddingMap from "@/components/courses/EmbeddingMap";
import { updatePageMeta } from "@/utils/seo";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { useAdmin } from "@/hooks/useAdmin";
import { notFound } from "next/navigation";
// import TranscriptUpload from "@/components/courses/TranscriptUpload";
// import { auth } from "@/lib/firebase-client";
// import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";

export default function ExplorePage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [recommendedIds, setRecommendedIds] = useState<string[]>([]);

  const [showAllCourses, setShowAllCourses] = useState(false);
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("relevance");
  const [groupBy, setGroupBy] = useState<string>("none");

  const [visibleCount, setVisibleCount] = useState<number>(50);
  const [viewMode, setViewMode] = useState<"grid" | "embedding">("grid");
  const { isAdmin, loading } = useAdmin();
  const router = useRouter();
  // const [user, setUser] = useState<{ uid: string } | null>(null);

  // useEffect(() => {
  //   const unsub = onAuthStateChanged(auth, (u) => {
  //     setUser(u ? { uid: u.uid } : null);
  //   });
  //   return () => unsub();
  // }, []);

  useEffect(() => {
    updatePageMeta(
      "Explore Courses",
      "Discover, search, and compare all Uppsala University courses"
    );
    fetchCoursesClient().then(setCourses);
  }, []);

  useEffect(() => {
    if (recommendedIds.length > 0) {
      setShowAllCourses(false);
      setSortBy("relevance");
    }
  }, [recommendedIds]);

  const baseResults = useMemo(() => {
    if (!showAllCourses && recommendedIds.length > 0) {
      // AI recommendations view
      const idToIndex = new Map(recommendedIds.map((id, idx) => [id, idx] as const));
      return courses
        .filter((c) => idToIndex.has(c.id))
        .sort((a, b) => (idToIndex.get(a.id) ?? 0) - (idToIndex.get(b.id) ?? 0));
    }

    // Non-AI view
    return courses;
  }, [courses, recommendedIds, showAllCourses]);


  const results = useMemo(() => {
    let next = baseResults;

    const q = search.trim().toLowerCase();
    if (q) {
      next = next.filter((c) => {
        const hay = [c.title, c.code, c.description, ...(c.tags || [])]
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      });
    }

    if (levelFilter !== "all") {
      next = next.filter((c) => (c.level || "Unknown") === levelFilter);
    }

    const sorted = [...next];
    if (sortBy === "title") {
      sorted.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortBy === "code") {
      sorted.sort((a, b) => (a.code || "").localeCompare(b.code || ""));
    } else if (sortBy === "level") {
      const order: Record<string, number> = { Preparatory: 1, "Bachelor's": 2, "Master's": 3, Unknown: 4 };
      sorted.sort((a, b) => (order[a.level || "Unknown"] ?? 99) - (order[b.level || "Unknown"] ?? 99));
    } else if (sortBy === "random") {
      // eslint-disable-next-line
      sorted.sort(() => Math.random() - 0.5);
    }

    return sorted;
  }, [baseResults, search, levelFilter, sortBy]);

  useEffect(() => {
    setVisibleCount(50);
  }, [search, levelFilter, sortBy, groupBy, showAllCourses, recommendedIds]);

  const visibleResults = useMemo(() => {
    return results.slice(0, Math.min(visibleCount, results.length));
  }, [results, visibleCount]);

  const groupedResults = useMemo(() => {
    if (groupBy !== "level") return null;
    const groups: Record<string, Course[]> = {};
    for (const c of visibleResults) {
      const key = c.level || "Unknown";
      groups[key] = groups[key] || [];
      groups[key].push(c);
    }
    const order = ["Preparatory", "Bachelor's", "Master's", "Unknown"];
    return order
      .filter((k) => (groups[k] || []).length > 0)
      .map((k) => ({ key: k, courses: groups[k] }));
  }, [groupBy, visibleResults]);

  if (loading) {
    return <div className="pt-24 px-4 max-w-5xl mx-auto text-gray-700 dark:text-gray-200">Loading...</div>;
  }
  // Return 404-page for non-admin users
  if (!loading && !isAdmin) {
    return notFound();
  }


  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-24 pb-12 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-3">UUAIS Course Navigator</h1>
          <p className="text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">Search all Uppsala University courses with natural language and explore their connections. Remember AI can and will make mistakes, double check information!</p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-10">
          <RagChat onRecommendations={setRecommendedIds} placeholder="Ask about courses, e.g. 'beginner statistics with labs'" />
          {/* {user && (<div className="mt-4 pt-4 ml-auto border-t border-gray-200 dark:border-gray-700 flex justify-end flex-col items-center gap-2">
            <p className="text-gray-600 dark:text-gray-300 italic">This feature is still under testing</p>
            <TranscriptUpload />
          </div>)} */}
        </div>

        <div className="mt-10">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-4">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                {!showAllCourses && recommendedIds.length > 0 ? "AI Recommendations" : "All Courses"}
              </h2>
              <div className="text-sm text-gray-600 dark:text-gray-300">
                {!showAllCourses && recommendedIds.length > 0
                  ? "Showing courses recommended by the AI."
                  : "Browse all courses without AI intervention."}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* View mode toggle */}
              <div className="flex rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${viewMode === "grid"
                    ? "bg-[#990000] text-white"
                    : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                    }`}
                >
                  Grid
                </button>
                <button
                  onClick={() => setViewMode("embedding")}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${viewMode === "embedding"
                    ? "bg-[#990000] text-white"
                    : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                    }`}
                >
                  Embedding Map
                </button>
              </div>

              {recommendedIds.length > 0 && !showAllCourses && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowAllCourses(true);
                    setRecommendedIds([]);
                  }}
                >
                  View all
                </Button>
              )}
              {recommendedIds.length > 0 && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setRecommendedIds([]);
                    setShowAllCourses(true);
                  }}
                >
                  Clear AI results
                </Button>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter by title, code, tag…"
                fullWidth
              />
              <Select
                value={levelFilter}
                onChange={(e) => setLevelFilter(e.target.value)}
                options={[
                  { value: "all", label: "All levels" },
                  { value: "Preparatory", label: "Preparatory" },
                  { value: "Bachelor's", label: "Bachelor's" },
                  { value: "Master's", label: "Master's" },
                  { value: "Unknown", label: "Unknown" },
                ]}
              />
              <Select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                options={[
                  { value: "relevance", label: "Sort: relevance" },
                  { value: "title", label: "Sort: title" },
                  { value: "code", label: "Sort: code" },
                  { value: "level", label: "Sort: level" },
                  { value: "random", label: "Sort: random" },
                ]}
              />
              <Select
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value)}
                options={[
                  { value: "none", label: "Group: none" },
                  { value: "level", label: "Group: level" },
                ]}
              />
            </div>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mt-3">
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Showing {visibleResults.length} of {results.length} course{results.length === 1 ? "" : "s"}
              </div>
            </div>
          </div>

          {viewMode === "embedding" ? (
            <div className="mt-6">
              <p>Temporarily disabled</p>
              <EmbeddingMap
                recommendedIds={recommendedIds}
                onCourseClick={(id) => router.push(`/explore/${id}`)}
                height={560}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Each dot represents a course, projected from its 768-dimensional embedding. Similar courses appear closer together. Recommended courses are highlighted.
              </p>
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-12 text-gray-600 dark:text-gray-300">No courses match your filters.</div>
          ) : groupedResults ? (
            <div className="space-y-10">
              {groupedResults.map((g) => (
                <div key={g.key}>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{g.key}</h3>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {g.courses.map((c) => (
                      <CourseCard key={c.id} course={c} hrefBase="/explore" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {visibleResults.map((c) => (
                <CourseCard key={c.id} course={c} hrefBase="/explore" />
              ))}
              {visibleResults.length < results.length && (
                <Button
                  variant="outline"
                  className="col-span-1 self-center md:col-span-2 lg:col-span-3"
                  onClick={() => {
                    setVisibleCount((prev) => Math.min(results.length, prev + 10));
                  }}
                >
                  Show more
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
