"use client";

import React from "react";
import type { NodeProps } from "reactflow";
import { Button } from "@/components/ui/Button";
import { SlidersHorizontal } from "lucide-react";
import type { Orientation } from "@/lib/programs/layout";

/** Why a run of semesters is standing empty in this view. */
export type SemesterGapReason = "track" | "other-track" | "empty";

export type SemesterGapData = {
  /** Consecutive semesters this marker stands in for. */
  semesters: number[];
  reason: SemesterGapReason;
  orientation: Orientation;
  /** Sends the reader to the specialisation picker; absent when there is none. */
  onChooseTrack?: () => void;
};

/** "Semester 7", "Semester 7–9". */
function label(semesters: number[]): string {
  const first = semesters[0];
  const last = semesters[semesters.length - 1];
  return first === last ? `Semester ${first}` : `Semester ${first}–${last}`;
}

const COPY: Record<SemesterGapReason, { heading: string; body: string; action: string | null }> = {
  track: {
    heading: "Taught inside a specialisation",
    body: "The study plan lists no common courses here — these semesters belong to the specialisations. Pick one to see what it teaches.",
    action: "Choose a specialisation",
  },
  "other-track": {
    heading: "Not part of this specialisation",
    body: "This specialisation lists nothing here. Other specialisations do teach these semesters.",
    action: "Change specialisation",
  },
  empty: {
    heading: "No courses listed",
    body: "The study plan names no courses for this stretch of the programme.",
    action: null,
  },
};

/**
 * Stands in for semesters this view has no courses for: without it, a programme taught only
 * inside its specialisations reads as though the study plan simply stops after year three.
 */
function SemesterGapNode({ data }: NodeProps<SemesterGapData>) {
  const copy = COPY[data.reason];
  const vertical = data.orientation === "vertical";

  return (
    <div
      className={`flex h-full w-full select-none overflow-hidden rounded-lg border border-dashed border-border bg-muted/40 px-4 py-3 ${
        vertical ? "flex-row items-center gap-5" : "flex-col gap-2"
      }`}
    >
      <p
        className={`shrink-0 font-mono text-[0.6875rem] uppercase leading-none tracking-[0.12em] text-muted-foreground ${
          vertical ? "w-28" : ""
        }`}
      >
        {label(data.semesters)}
      </p>

      <div className="min-w-0 max-w-[30ch]">
        <p className="text-[1.0625rem] font-semibold leading-tight tracking-[-0.028em] text-foreground">
          {copy.heading}
        </p>
        <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-muted-foreground">{copy.body}</p>

        {copy.action && data.onChooseTrack ? (
          <Button
            variant="outline"
            icon={SlidersHorizontal}
            onClick={data.onChooseTrack}
            className="mt-3 bg-card"
          >
            {copy.action}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export default React.memo(SemesterGapNode);
