"use client";

import { ProgramTrack } from "@/lib/types/program";
import Link from "next/link";
import { GitBranch, ChevronRight, Beaker, Cpu, Zap, Settings, Calculator, Power, Leaf } from "lucide-react";

interface TrackOverviewProps {
  tracks: ProgramTrack[];
  programId: string;
}

const trackIcons: Record<string, typeof Beaker> = {
  "computational-engineering": Calculator,
  "electrification": Power,
  "embedded-systems": Cpu,
  "applied-physics": Zap,
  "sustainable-energy": Leaf,
  general: Settings,
};

export function TrackOverview({ tracks, programId }: TrackOverviewProps) {
  // Filter out the general track for display
  const specializationTracks = tracks.filter((t) => t.id !== "general");

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <GitBranch className="h-6 w-6 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Specialization Tracks
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Choose your focus area for advanced studies
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {specializationTracks.map((track) => {
          const Icon = trackIcons[track.id] || Beaker;
          return (
            <Link
              key={track.id}
              href={`/explore/program/${programId}/tracks/${track.id}`}
              className="no-underline group block p-4 rounded-lg border-2 border-gray-100 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-800 transition-all duration-200 bg-gray-50/50 dark:bg-gray-900/30"
            >
              <div className="flex items-start gap-4">
                <div
                  className="p-3 rounded-lg shrink-0"
                  style={{ backgroundColor: `${track.color}20` }}
                >
                  <Icon
                    className="h-6 w-6"
                    style={{ color: track.color }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {track.name}
                    </h3>
                    <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-blue-500 transition-colors" />
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">
                    {track.description}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span>{(track.requiredCourseIds || track.requiredCourses || []).length} required</span>
                    <span>•</span>
                    <span>{(track.electiveCourseIds || track.electiveCourses || []).length} electives</span>
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
