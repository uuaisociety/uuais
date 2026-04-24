"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { fetchCoursesClient, fetchCoursesByIdsClient, primeCourseClientCache } from "@/lib/firestore/courses";
import type { Course } from "@/lib/courses";
import RagChat from "@/components/common/RagChat";
import CourseCard from "@/components/courses/CourseCard";
import { updatePageMeta } from "@/utils/seo";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Heart } from "lucide-react";

export default function ExplorePage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [recommendedIds, setRecommendedIds] = useState<string[]>([]);
  const [recommendedCourses, setRecommendedCourses] = useState<Course[]>([]);
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false);
  const [hasLoadedRecommendations, setHasLoadedRecommendations] = useState(false);
  const [isWaitingForAI, setIsWaitingForAI] = useState(false);

  const [showAllCourses, setShowAllCourses] = useState(false);
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState<string>("all");

  // Pagination state
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState<number>(50);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const latestRequestId = useRef(0);
  const pageCourseLimit = 50;
  useEffect(() => {
    updatePageMeta(
      "Explore Courses",
      "Discover, search, and compare all Uppsala University courses"
    );
  }, []);

  // Load courses function
  const loadCourses = useCallback(async (pageNum: number, searchQuery?: string, level?: string) => {
    const requestId = ++latestRequestId.current;
    setIsLoading(true);
    try {
      const result = await fetchCoursesClient({ 
        page: pageNum, 
        limit: pageCourseLimit,
        search: searchQuery || '',
        level: level || 'all',
      });

      if (requestId !== latestRequestId.current) {
        return;
      }
      
      if (pageNum === 1) {
        setCourses(result.courses);
      } else {
        setCourses(prev => [...prev, ...result.courses]);
      }
      primeCourseClientCache(result.courses);
      
      setPage(result.pagination.page);
      setTotalPages(result.pagination.totalPages);
      setHasNextPage(result.pagination.hasNextPage);
    } catch (error) {
      console.error('Failed to load courses:', error);
    } finally {
      if (requestId === latestRequestId.current) {
        setIsLoading(false);
        setInitialLoadComplete(true);
      }
    }
  }, []);

  // Fetch full course details for recommendations
  const loadRecommendedCourses = useCallback(async (ids: string[]) => {
    if (ids.length === 0) {
      setRecommendedCourses([]);
      return;
    }
    
    setIsLoadingRecommendations(true);
    try {
      const matched = await fetchCoursesByIdsClient(ids);
      setRecommendedCourses(matched);
      setHasLoadedRecommendations(true);
    } catch (error) {
      console.error('Failed to load recommended courses:', error);
      setHasLoadedRecommendations(true);
    } finally {
      setIsLoadingRecommendations(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void loadCourses(1, search, levelFilter);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadCourses]);

  // Handle AI recommendations
  useEffect(() => {
    queueMicrotask(() => {
      if (recommendedIds.length > 0) {
        void loadRecommendedCourses(recommendedIds);
        return;
      }

      setRecommendedCourses([]);
      setHasLoadedRecommendations(false);
    });
  }, [recommendedIds, loadRecommendedCourses]);

  const baseResults = useMemo(() => {
    if (!showAllCourses && recommendedIds.length > 0) {
      // AI recommendations view - use pre-loaded recommended courses
      return recommendedCourses;
    }

    // Non-AI view
    return courses;
  }, [courses, recommendedIds, recommendedCourses, showAllCourses]);


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

    return [...next];
  }, [baseResults, search, levelFilter]);

  const visibleResults = useMemo(() => {
    return results.slice(0, Math.min(visibleCount, results.length));
  }, [results, visibleCount]);

  const showInitialCourseSkeleton =
    !isWaitingForAI &&
    !isLoadingRecommendations &&
    !hasLoadedRecommendations &&
    recommendedIds.length === 0 &&
    (!initialLoadComplete || (isLoading && courses.length === 0));

  const canShowClientMore = visibleResults.length < results.length;
  const canLoadMoreFromServer = !canShowClientMore && hasNextPage && !isLoading;
  const showServerLoadMoreLoading = !canShowClientMore && hasNextPage && isLoading && initialLoadComplete;

  const handleLoadMore = useCallback(() => {
    if ((showAllCourses || recommendedIds.length === 0) && hasNextPage && !isLoading) {
      loadCourses(page + 1, search, levelFilter);
    } 
    setVisibleCount(prev => Math.min(results.length, prev + 10));
  }, [showAllCourses, recommendedIds.length, hasNextPage, isLoading, page, search, levelFilter, loadCourses, results.length]);

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setVisibleCount(50);
    if (showAllCourses || recommendedIds.length === 0) {
      loadCourses(1, value, levelFilter);
    }
  }, [showAllCourses, recommendedIds.length, levelFilter, loadCourses]);

  const handleLevelFilterChange = useCallback((value: string) => {
    setLevelFilter(value);
    setVisibleCount(50);
    if (showAllCourses || recommendedIds.length === 0) {
      loadCourses(1, search, value);
    }
  }, [showAllCourses, recommendedIds.length, search, loadCourses]);

  const handleClearRecommendations = useCallback(() => {
    setRecommendedIds([]);
    setRecommendedCourses([]);
    setHasLoadedRecommendations(false);
    setIsWaitingForAI(false);
    setShowAllCourses(true);
    setVisibleCount(50);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-24 pb-12 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-3">UUAIS Course Navigator</h1>
          <p className="text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">Search all Uppsala University courses with natural language and explore their connections. Remember AI can and will make mistakes, double check information!</p>
           <div className="text-sm text-gray-600 dark:text-gray-300 italic pt-2">This is an early prototype, expect some inaccuracies.</div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-10">
          <RagChat 
            onRecommendations={(ids) => {
              setShowAllCourses(false);
              setHasLoadedRecommendations(false);
              setIsWaitingForAI(false);
              setRecommendedIds(ids);
            }} 
            onThinkingStart={() => setIsWaitingForAI(true)}
            placeholder="Ask about courses, e.g. 'beginner statistics with labs'" 
          />
          {/* {user && (<div className="mt-4 pt-4 ml-auto border-t border-gray-200 dark:border-gray-700 flex justify-end flex-col items-center gap-2">
            <p className="text-gray-600 dark:text-gray-300 italic">This feature is still under testing</p>
            <TranscriptUpload />
          </div>)} */}
        </div>

        <div className="mt-10">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-4">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                {isWaitingForAI ? "AI is thinking..." : !showAllCourses && recommendedIds.length > 0 ? (
                  isLoadingRecommendations ? "Loading AI Recommendations..." : "AI Recommendations"
                ) : "All Courses"}
              </h2>
              <div className="text-sm text-gray-600 dark:text-gray-300">
                {!showAllCourses && recommendedIds.length > 0
                  ? "Showing courses recommended by the AI."
                  : "Browse all courses without AI intervention."}
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              {recommendedIds.length > 0 && (
                <Button variant="outline" onClick={handleClearRecommendations}>
                  Clear recommendations
                </Button>
              )}
              <Button asChild variant="outline">
                <Link href="/my-courses" className="flex items-center gap-1">
                  <Heart className="text-[#990000] h-4 w-4" />
                  Saved courses
                </Link>
              </Button>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Filter by title, code, tag…"
                fullWidth
              />
              <Select
                value={levelFilter}
                onChange={(e) => handleLevelFilterChange(e.target.value)}
                options={[
                  { value: "all", label: "All levels" },
                  { value: "Preparatory", label: "Preparatory" },
                  { value: "Bachelor's", label: "Bachelor's" },
                  { value: "Master's", label: "Master's" },
                  { value: "Unknown", label: "Unknown" },
                ]}
              />
            </div>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mt-3">
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Showing {visibleResults.length} of {results.length} course{results.length === 1 ? "" : "s"}
                {hasNextPage && ` (page ${page} of ${totalPages})`}
              </div>
            </div>
          </div>

          {isWaitingForAI || (!hasLoadedRecommendations && recommendedIds.length > 0) || isLoadingRecommendations ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 animate-pulse">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-3"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-4"></div>
                  <div className="space-y-2">
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-4/6"></div>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
                    <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-12"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : showInitialCourseSkeleton ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 animate-pulse">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-3"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-2"></div>
                  <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-4"></div>
                  <div className="space-y-2 mb-6">
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-4/6"></div>
                  </div>
                  <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                </div>
              ))}
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-12 text-gray-600 dark:text-gray-300">No courses found, please try again.</div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {visibleResults.map((c) => (
                <CourseCard key={c.id} course={c} hrefBase="/explore" />
              ))}
              {canLoadMoreFromServer && (
                <Button
                  variant="outline"
                  className="col-span-1 self-center md:col-span-2 lg:col-span-3"
                  onClick={handleLoadMore}
                >
                  Load more from server
                </Button>
              )}
              {canShowClientMore && (
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
              {showServerLoadMoreLoading && (
                <div className="col-span-1 self-center md:col-span-2 lg:col-span-3 text-center text-sm text-gray-500 dark:text-gray-400">
                  Loading more courses...
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
