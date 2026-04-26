"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAllPrograms } from "@/lib/program/programs";
import { BookOpen, ChevronRight, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { Program } from "@/lib/types/program";

const PROGRAM_STORAGE_KEY = "selected_program_id";

export default function ProgramSelectionPage() {
  const router = useRouter();
  const [programs, setPrograms] = useState<Program[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    // Check if user already has a selected program and redirect
    const saved = localStorage.getItem(PROGRAM_STORAGE_KEY);
    if (saved) {
      const exists = programs?.find((p) => p.id === saved);
      if (exists) {
        router.push(`/explore/program/${saved}`);
      }
    }
  }, [programs, router]);
  
  useEffect(() => {
    // Load programs
    (async () => {
      const programs = await getAllPrograms();
      setPrograms(programs);
    })();
  }, []);

  const handleSelectProgram = (id: string) => {
    setSelectedId(id);
    localStorage.setItem(PROGRAM_STORAGE_KEY, id);
    router.push(`/explore/program/${id}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-24 pb-12 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            Choose Your Program
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Select your university program to explore the curriculum, track your progress,
            and visualize course connections.
          </p>
        </div>

        {/* Program Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {programs && programs.map((program) => (
            <div
              key={program.id}
              className="group bg-white dark:bg-gray-800 rounded-xl shadow-sm border-2 border-gray-200 dark:border-gray-700 hover:border-[#990000] dark:hover:border-[#990000] transition-all duration-300 overflow-hidden"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <GraduationCap className="h-8 w-8 text-[#990000]" />
                  </div>
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    {program.code}
                  </span>
                </div>

                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  {program.name}
                </h2>

                <div className="space-y-2 mb-6">
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                    <BookOpen className="h-4 w-4" />
                    <span>{program.credits} credits</span>
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Valid from {program.validFrom}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {program.tracks.length - 1} specialization tracks
                  </div>
                </div>

                <Button
                  onClick={() => handleSelectProgram(program.id)}
                  disabled={selectedId === program.id}
                  className="w-full bg-[#990000] hover:bg-[#7f0000] text-white"
                >
                  {selectedId === program.id ? (
                    <span className="flex items-center gap-2">
                      Loading...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      Explore Program
                      <ChevronRight className="h-4 w-4" />
                    </span>
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Coming Soon Placeholder */}
        {programs && programs.length === 1 && (
          <div className="mt-8 grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-gray-100 dark:bg-gray-800/50 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 p-6 flex flex-col items-center justify-center text-center">
              <div className="p-3 bg-gray-200 dark:bg-gray-700 rounded-lg mb-4">
                <GraduationCap className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-500 dark:text-gray-400 mb-2">
                More Programs Coming Soon
              </h3>
              <p className="text-sm text-gray-400 dark:text-gray-500">
                Additional programs will be added in future updates
              </p>
            </div>
          </div>
        )}

        {/* Back to Courses Link */}
        <div className="mt-12 text-center">
          <Link href="/explore">
            <Button variant="outline">
              Back to Course Explorer
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
