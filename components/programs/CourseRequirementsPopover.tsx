"use client";

import React from "react";
import { CircleSlash, CornerDownRight } from "lucide-react";
import type { ProgramCourse, ProgramEdge } from "@/lib/programs";
import { courseHref } from "@/lib/programs/format";
import { EDGE_STYLE } from "./constants";

export type RequirementLink = {
  code: string;
  title: string;
  type: ProgramEdge["type"];
};

/**
 * The prerequisites behind one course, kept above the university's own wording rather than
 * instead of it: the links are machine-extracted from that sentence.
 */
export default function CourseRequirementsPopover({
  course,
  requires,
  unlocks,
  fromPath,
}: {
  course: ProgramCourse;
  requires: RequirementLink[];
  unlocks: RequirementLink[];
  fromPath?: string;
}) {
  const hard = requires.filter((r) => r.type === "HARD");
  const soft = requires.filter((r) => r.type === "SOFT");
  const exclusive = requires.filter((r) => r.type === "EXCLUSIVE");

  const section = (label: string, links: RequirementLink[], hint?: string) =>
    links.length > 0 ? (
      <div>
        <p className="font-mono text-[0.6875rem] uppercase tracking-[0.1em] text-muted-foreground">
          {label}
        </p>
        {hint ? <p className="mt-0.5 text-[0.6875rem] text-muted-foreground">{hint}</p> : null}
        <ul className="mt-1 space-y-0.5">
          {links.map((link) => (
            <li key={`${link.type}-${link.code}`} className="text-xs leading-snug">
              <a
                href={courseHref(link.code, fromPath)}
                className="text-foreground underline-offset-2 hover:underline"
              >
                <span className="font-mono text-[0.6875rem] text-muted-foreground">
                  {link.code}
                </span>
                {/* A course outside the current selection has no title to show; the
                    fallback is its code, which would otherwise print twice. */}
                {link.title && link.title !== link.code ? ` ${link.title}` : null}
              </a>
            </li>
          ))}
        </ul>
      </div>
    ) : null;

  return (
    <div className="w-[min(20rem,calc(100vw-3rem))] space-y-3 rounded-lg border border-border bg-card p-3 text-left shadow-lg">
      <div>
        <p className="text-[0.9375rem] font-semibold leading-tight text-foreground">
          {course.titleEn || course.titleSv}
        </p>
        <p className="mt-0.5 font-mono text-[0.6875rem] text-muted-foreground">
          {course.code}
          <span className="mx-1.5 opacity-40">•</span>
          {course.credits ?? "?"} hp
          {course.depthCode ? (
            <>
              <span className="mx-1.5 opacity-40">•</span>
              {course.depthCode}
            </>
          ) : null}
        </p>
      </div>

      {section("Requires", hard, EDGE_STYLE.HARD.description)}
      {section("Recommended", soft, EDGE_STYLE.SOFT.description)}
      {section("Cannot combine with", exclusive)}
      {section("Unlocks", unlocks)}

      {requires.length === 0 && unlocks.length === 0 ? (
        <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
          <CircleSlash className="mt-0.5 h-3 w-3 shrink-0" />
          No prerequisites within this programme.
        </p>
      ) : null}

      {course.entryRequirements ? (
        <div className="border-t border-border pt-2">
          <p className="font-mono text-[0.6875rem] uppercase tracking-[0.1em] text-muted-foreground">
            From the course syllabus
          </p>
          <p className="mt-1 flex gap-1.5 text-[0.6875rem] leading-relaxed text-muted-foreground">
            <CornerDownRight className="mt-0.5 h-3 w-3 shrink-0 opacity-60" />
            <span>{course.entryRequirements}</span>
          </p>
        </div>
      ) : null}

      {course.onlyProgramme ? (
        <p className="rounded-sm bg-muted/60 px-2 py-1 text-[0.6875rem] text-muted-foreground">
          Open only to students on this programme.
        </p>
      ) : null}
    </div>
  );
}
