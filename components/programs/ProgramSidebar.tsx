"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeftRight, GraduationCap, MousePointerClick } from "lucide-react";
import type { ProgramSpecialisation } from "@/lib/programs";
import type { ProgramProgress } from "@/lib/programs/status";
import TrackPicker from "./TrackPicker";
import { Button } from "@/components/ui/Button";
import ProgressDonut from "./ProgressDonut";
import { SidebarLegend } from "./ProgramLegend";

export type ProgramSummary = {
  code: string;
  nameSv: string;
  /** English name leading, the university's Swedish title beneath it. */
  displayName: string;
  displayNameSv: string | null;
  totalCredits: number | null;
  semesters: number;
};

export default function ProgramSidebar({
  program,
  specialisations,
  selectedTrack,
  progress,
  markedCount,
  onClearMarks,
}: {
  program: ProgramSummary;
  specialisations: ProgramSpecialisation[];
  selectedTrack: string | null;
  progress: ProgramProgress | null;
  markedCount: number;
  onClearMarks: () => void;
}) {
  return (
    // One panel divided by hairlines rather than four stacked boxes: identical borders gave
    // each section the weight of a separate card.
    <aside className="lg:sticky lg:top-24 lg:self-start">
      <div className="divide-y divide-border rounded-lg border border-border bg-card">
        <section className="p-4">
          <div className="flex items-baseline justify-between gap-2">
            <p className="font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground">
              Programme
            </p>
            {/* A reader who lands on the wrong degree — or wants to compare two —
                otherwise has to find their way back through the site nav. */}
            <Link
              href="/programs"
              className="inline-flex shrink-0 items-center gap-1 rounded-sm text-[0.6875rem] text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ArrowLeftRight aria-hidden className="h-3 w-3" />
              Change
            </Link>
          </div>
          <h2 className="mt-2 flex items-start gap-2 text-[1.0625rem] font-semibold leading-tight tracking-[-0.028em] text-foreground">
            <GraduationCap className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            {program.displayName}
          </h2>
          {program.displayNameSv ? (
            <p className="mt-1 text-[0.9375rem] leading-tight text-muted-foreground">
              {program.displayNameSv}
            </p>
          ) : null}
          <p className="mt-2 font-mono text-[0.6875rem] uppercase tracking-[0.1em] text-muted-foreground">
            {program.code}
            <span className="mx-1.5 opacity-40">•</span>
            {program.totalCredits} hp
          </p>
        </section>

        <section className="p-4">
          <TrackPicker specialisations={specialisations} selected={selectedTrack} />
        </section>

        <section className="p-4">
          <p className="font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground">
            Your progress
          </p>

          {progress ? (
            <div className="mt-3">
              <ProgressDonut percent={progress.percentComplete} counts={progress.counts} />
              <p className="mt-3 border-t border-border pt-3 font-mono text-[0.6875rem] text-muted-foreground">
                {progress.creditsCompleted} of {progress.creditsRequired} required hp
              </p>
              {markedCount > 0 ? (
                <Button
                  variant="link"
                  size="sm"
                  onClick={onClearMarks}
                  className="mt-2 h-auto px-0 text-xs font-normal text-muted-foreground hover:text-foreground"
                >
                  Clear {markedCount} marked course{markedCount === 1 ? "" : "s"}
                </Button>
              ) : null}
            </div>
          ) : (
            <p className="mt-3 flex gap-2 text-xs leading-relaxed text-muted-foreground">
              <MousePointerClick className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                Mark the courses you have passed on the map to see how far through the
                programme you are, and what you can take next. Your marks stay in this
                browser.
              </span>
            </p>
          )}
        </section>

        <section className="p-4">
          <SidebarLegend />
        </section>
      </div>
    </aside>
  );
}
