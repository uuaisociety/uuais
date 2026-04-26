"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { getProgramById } from "@/lib/program/programs";
import { Program } from "@/lib/types/program";
import Link from "next/link";
import { Calculator, Power, Cpu, Zap, Leaf, ArrowRight } from "lucide-react";

const trackIcons: Record<string, typeof Calculator> = {
  "computational-engineering": Calculator,
  "electrification": Power,
  "embedded-systems": Cpu,
  "applied-physics": Zap,
  "sustainable-energy": Leaf,
};

export default function TracksPage() {
  const params = useParams();
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

  // Skeleton loading state
  if (loading) {
    return (
      <div className="space-y-8 animate-pulse">
        {/* Header Skeleton */}
        <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
        {/* Track Cards Skeleton */}
        <div className="grid gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-48 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
          ))}
        </div>
        {/* General Track Skeleton */}
        <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
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

  const specializationTracks = program.tracks.filter((t) => t.id !== "general");

  return (
    <div className="space-y-8">
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-6 border border-blue-100 dark:border-blue-800">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Choose Your Specialization
        </h2>
        <p className="text-gray-600 dark:text-gray-300">
          Engineering Physics offers {specializationTracks.length} specialization tracks.
          Each track provides focused training for specific career paths. You typically choose
          your track during your third year of study.
        </p>
      </div>

      <div className="grid gap-6">
        {specializationTracks.map((track, index) => {
          const Icon = trackIcons[track.id] || Calculator;
          return (
            <Link
              key={track.id}
              href={`/explore/program/${programId}/tracks/${track.id}`}
              className="group block no-underline bg-white dark:bg-gray-800 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 transition-all duration-200 overflow-hidden"
            >
              <div className="flex flex-col md:flex-row">
                {/* Track Color Bar */}
                <div
                  className="w-full md:w-2 h-2 md:h-auto shrink-0"
                  style={{ backgroundColor: track.color }}
                />

                <div className="p-6 flex-1">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div
                        className="p-3 rounded-xl"
                        style={{ backgroundColor: `${track.color}20` }}
                      >
                        <Icon className="h-8 w-8" style={{ color: track.color }} />
                      </div>
                      <div>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          Track {index + 1}
                        </span>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {track.name}
                        </h3>
                      </div>
                    </div>
                    <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-blue-500 transition-colors" />
                  </div>

                  <p className="text-gray-600 dark:text-gray-300 mb-4">
                    {track.description}
                  </p>

                  <div className="flex flex-wrap gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-md text-gray-700 dark:text-gray-300 font-medium">
                        {(track.requiredCourseIds || track.requiredCourses || []).length} required
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-md text-gray-700 dark:text-gray-300 font-medium">
                        {(track.electiveCourseIds || track.electiveCourses || []).length} electives
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* General Track Info */}
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Flexible Path
        </h3>
        <p className="text-gray-600 dark:text-gray-300 text-sm">
          Not sure which track to choose? The general track allows you to combine courses
          from different specializations to create a personalized curriculum that matches
          your specific interests and career goals.
        </p>
      </div>
    </div>
  );
}
