"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { getProgramById } from "@/lib/program/programs";
import { Program } from "@/lib/types/program";
import { Button } from "@/components/ui/Button";
import {
  ChevronLeft,
  LayoutGrid,
  GitBranch,
  Target,
  Settings,
  Network,
} from "lucide-react";

const PROGRAM_STORAGE_KEY = "selected_program_id";

export default function ProgramLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const programId = params.id as string;

  const [program, setProgram] = useState<Program | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProgram = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getProgramById(programId);
      if (data) {
        setProgram(data);
        localStorage.setItem(PROGRAM_STORAGE_KEY, programId);
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
    loadProgram();
  }, [loadProgram]);

  const handleChangeProgram = () => {
    localStorage.removeItem(PROGRAM_STORAGE_KEY);
    router.push("/explore/program");
  };

  const isActiveTab = (tab: string) => {
    if (tab === "overview" && pathname === `/explore/program/${programId}`) {
      return true;
    }
    if (tab === "tracks" && pathname.includes("/tracks")) {
      return true;
    }
    if (tab === "graph" && pathname.includes("/graph")) {
      return true;
    }
    return false;
  };

  // Skeleton loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-24 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header Skeleton */}
          <div className="mb-8 animate-pulse">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-8 w-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
              <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
            <div className="h-10 w-96 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
            <div className="h-4 w-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
          {/* Tab Skeleton */}
          <div className="border-b border-gray-200 dark:border-gray-700 mb-8">
            <div className="flex gap-6">
              <div className="h-10 w-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
              <div className="h-10 w-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
              <div className="h-10 w-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
          </div>
          {/* Content Skeleton */}
          <div className="space-y-6 animate-pulse">
            <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
            <div className="grid grid-cols-4 gap-4">
              <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
              <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
              <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
              <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            </div>
            <div className="h-96 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !program) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-24 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            {error || "Program Not Found"}
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            The program you&apos;re looking for doesn&apos;t exist or couldn&apos;t be loaded.
          </p>
          <Link href="/explore/program">
            <Button>Choose a Program</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-24 pb-12 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header with Program Info */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Link href="/explore/program">
                  <Button variant="outline" size="sm" icon={ChevronLeft}>
                    Back
                  </Button>
                </Link>
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  {program.code}
                </span>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
                {program.name}
              </h1>
              <p className="text-gray-600 dark:text-gray-300 mt-1">
                {program.credits} credits • Valid from {program.validFrom}
              </p>
            </div>
            <Button
              variant="outline"
              onClick={handleChangeProgram}
              icon={Settings}
              className="self-start"
            >
              Change Program
            </Button>
          </div>

          {/* Navigation Tabs */}
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="flex gap-6">
              <Link
                href={`/explore/program/${programId}`}
                className={`flex items-center gap-2 pb-4 border-b-2 transition-colors ${
                  isActiveTab("overview")
                    ? "border-[#990000] text-[#990000]"
                    : "border-transparent text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                <LayoutGrid className="h-4 w-4" />
                Overview
              </Link>
              <Link
                href={`/explore/program/${programId}/tracks`}
                className={`flex items-center gap-2 pb-4 border-b-2 transition-colors ${
                  isActiveTab("tracks")
                    ? "border-[#990000] text-[#990000]"
                    : "border-transparent text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                <GitBranch className="h-4 w-4" />
                Tracks
              </Link>
              <Link
                href={`/explore/program/${programId}/requirements`}
                className={`flex items-center gap-2 pb-4 border-b-2 transition-colors ${
                  pathname.includes("/requirements")
                    ? "border-[#990000] text-[#990000]"
                    : "border-transparent text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                <Target className="h-4 w-4" />
                Requirements
              </Link>
              <Link
                href={`/explore/program/${programId}/graph`}
                className={`flex items-center gap-2 pb-4 border-b-2 transition-colors ${
                  isActiveTab("graph")
                    ? "border-[#990000] text-[#990000]"
                    : "border-transparent text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                <Network className="h-4 w-4" />
                Graph
              </Link>
            </nav>
          </div>
        </div>

        {/* Page Content */}
        {children}
      </div>
    </div>
  );
}
