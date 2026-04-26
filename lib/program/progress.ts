"use client";

import { useState, useEffect, useCallback } from "react";
import { ProgramProgress } from "../types/program";

const STORAGE_KEY = "program_progress";

/**
 * Hook for managing program progress
 * Falls back to localStorage for anonymous users
 * Can be extended to sync with Firestore for authenticated users
 */
export function useProgramProgress(programId: string) {
  const storageKey = `${STORAGE_KEY}_${programId}`;
  const [hasMounted, setHasMounted] = useState(false);

  const [progress, setProgress] = useState<ProgramProgress>(() => {
    // Try to load from localStorage on initial render
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          return JSON.parse(saved) as ProgramProgress;
        }
      } catch {
        // Fall through to default
      }
    }
    return {
      programId,
      completedCourseCodes: [],
      lastUpdated: 0,
    };
  });

  // Track hydration
  useEffect(() => {
    // Use requestAnimationFrame to defer state update until after render
    const id = requestAnimationFrame(() => setHasMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // Save progress to localStorage whenever it changes
  useEffect(() => {
    if (hasMounted && typeof window !== "undefined") {
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          ...progress,
          lastUpdated: Date.now(),
        })
      );
    }
  }, [progress, programId, hasMounted, storageKey]);

  const toggleCourseCompletion = useCallback(
    (courseCode: string) => {
      setProgress((prev) => {
        const completed = prev.completedCourseCodes.includes(courseCode);
        return {
          ...prev,
          completedCourseCodes: completed
            ? prev.completedCourseCodes.filter((c) => c !== courseCode)
            : [...prev.completedCourseCodes, courseCode],
        };
      });
    },
    []
  );

  const selectTrack = useCallback((trackId: string) => {
    setProgress((prev) => ({
      ...prev,
      selectedTrackId: trackId,
    }));
  }, []);

  const clearProgress = useCallback(() => {
    setProgress({
      programId,
      completedCourseCodes: [],
      lastUpdated: Date.now(),
    });
  }, [programId]);

  const isCourseCompleted = useCallback(
    (courseCode: string) => {
      return progress.completedCourseCodes.includes(courseCode);
    },
    [progress.completedCourseCodes]
  );

  const completedCredits = useCallback(
    (courses: { code: string; credits: number }[]) => {
      return courses
        .filter((c) => progress.completedCourseCodes.includes(c.code))
        .reduce((sum, c) => sum + c.credits, 0);
    },
    [progress.completedCourseCodes]
  );

  return {
    progress,
    isLoaded: hasMounted,
    toggleCourseCompletion,
    selectTrack,
    clearProgress,
    isCourseCompleted,
    completedCredits,
  };
}

/**
 * Get the currently selected program from localStorage
 */
export function getSelectedProgramId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("selected_program_id");
}

/**
 * Set the selected program in localStorage
 */
export function setSelectedProgramId(programId: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("selected_program_id", programId);
}

/**
 * Clear the selected program from localStorage
 */
export function clearSelectedProgramId(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem("selected_program_id");
}
