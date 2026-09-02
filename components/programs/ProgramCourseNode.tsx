"use client";

import React, { useCallback, useEffect, useRef } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import { CheckCircle2, Circle, Clock, ExternalLink, HelpCircle } from "lucide-react";
import type { ProgramCourse } from "@/lib/programs";
import type { CourseStatus } from "@/lib/programs/status";
import { courseHref } from "@/lib/programs/format";
import { Button } from "@/components/ui/Button";
import { CATEGORY_STYLE, STATUS_STYLE } from "./constants";
import CourseRequirementsPopover, { type RequirementLink } from "./CourseRequirementsPopover";

export type ProgramCourseNodeData = {
  course: ProgramCourse;
  status: CourseStatus | null;
  /** How many teaching periods the course runs across. */
  periodSpan: number;
  /** Faded because another course is hovered and this one is unrelated to it. */
  dimmed: boolean;
  focused: boolean;
  selected: boolean;
  manuallyPassed: boolean;
  requires: RequirementLink[];
  unlocks: RequirementLink[];
  /** Owned by the canvas, so only one is open and it can keep the course traced. */
  helpOpen: boolean;
  /** Hover opens transiently; a click pins it open until dismissed. */
  onOpenHelp: (code: string) => void;
  onPinHelp: (code: string) => void;
  onCloseHelp: () => void;
  /**
   * The specialisation that contributed this course, when one did. Trunk courses
   * carry none, which is what makes a track's additions readable on the map.
   */
  trackLabel: string | null;
  /** When on, clicking the card marks it passed rather than opening its page. */
  markMode: boolean;
  /** Which axis time runs along, so connectors leave the correct edge of the card. */
  orientation: "horizontal" | "vertical";
  /** The map this card belongs to, carried through so the course page can come back to it. */
  fromPath?: string;
  onTogglePassed: (code: string) => void;
};

/**
 * Grace period before a hovered popover closes: long enough to cross from the card to the
 * panel at a slow, angled pace, short enough not to feel stuck open.
 */
const HELP_CLOSE_DELAY_MS = 260;

const STATUS_ICON: Record<CourseStatus, React.ElementType> = {
  COMPLETED: CheckCircle2,
  IN_PROGRESS: Circle,
  UPCOMING: Clock,
  NOT_STARTED: Circle,
};

function ProgramCourseNode({ data }: NodeProps<ProgramCourseNodeData>) {
  const {
    course,
    status,
    periodSpan,
    dimmed,
    focused,
    selected,
    manuallyPassed,
    requires,
    unlocks,
    helpOpen,
    onOpenHelp,
    onPinHelp,
    onCloseHelp,
    trackLabel,
    markMode,
    orientation,
    onTogglePassed,
    fromPath,
  } = data;
  // Vertical stacks semesters top to bottom; left/right handles there sent every edge out
  // sideways and back, crossing the neighbouring cards on the way.
  const incoming = orientation === "vertical" ? Position.Top : Position.Left;
  const outgoing = orientation === "vertical" ? Position.Bottom : Position.Right;
  /**
   * Leaving only schedules the close; the panel sits beside the card, so the pointer must
   * cross a gap to reach it.
   */
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelClose = useCallback(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);

  const scheduleClose = useCallback(() => {
    cancelClose();
    closeTimer.current = setTimeout(() => {
      closeTimer.current = null;
      onCloseHelp();
    }, HELP_CLOSE_DELAY_MS);
  }, [cancelClose, onCloseHelp]);

  useEffect(() => cancelClose, [cancelClose]);

  const category = CATEGORY_STYLE[course.category];
  const StatusIcon = status ? STATUS_ICON[status] : null;

  return (
    // The dim lives on an inner wrapper, never the root: CSS opacity cascades to
    // descendants, so dimming the root would make the popover translucent too.
    <div
      className="group relative h-full w-full"
      onMouseEnter={cancelClose}
      onMouseLeave={scheduleClose}
    >
      <div
        className={`flex h-full w-full flex-col rounded-md border bg-card px-3 py-2.5 text-left shadow-sm transition-all duration-150 group-hover:shadow-md ${
          selected
            ? "border-[var(--chart-2)] ring-1 ring-[var(--chart-2)]"
            : focused
              ? "border-foreground/40 shadow-md"
              : status === "COMPLETED"
                ? "border-[var(--chart-4)]/60"
                : "border-border"
        } ${dimmed ? "opacity-25" : "opacity-100"} ${
          markMode ? "cursor-pointer group-hover:ring-1 group-hover:ring-[var(--chart-4)]" : ""
        }`}
      >
        <Handle
          type="target"
          position={incoming}
          className="!h-1.5 !w-1.5 !border-0 !bg-border"
        />

        {/* Full width rather than sharing its line with the controls: truncated, half
            these course names stopped being identifiable. */}
        <p className="line-clamp-3 text-[0.9375rem] font-semibold leading-tight tracking-[-0.02em] text-foreground">
          {course.titleEn || course.titleSv}
        </p>

        {/* Metadata and controls sit on the floor of the card, so a one-line title
            leaves its slack in the middle instead of below the last thing written. */}
        <div className="mt-auto pt-2">
          <p className="flex min-w-0 items-center gap-1.5 truncate font-mono text-[0.6875rem] tracking-[0.1em] text-muted-foreground">
            <span
              aria-hidden
              className="h-2 w-2 shrink-0 rounded-sm"
              style={{ backgroundColor: category.color }}
            />
            {/* The swatch alone would leave the category available only as colour. */}
            <span className="sr-only">{category.label}. </span>
            {course.credits ?? "?"} hp
            <span className="mx-1.5 opacity-40">•</span>
            {course.code}
            {periodSpan > 1 ? (
              <span className="ml-1.5 opacity-70" title={`Runs across ${periodSpan} periods`}>
                ×{periodSpan}
              </span>
            ) : null}
          </p>

          <div className="-mb-2 -mr-2 mt-1 flex items-center justify-between gap-2">
            {/* Which specialisation put this card on the map. Without it, choosing one
                changes the course count and nothing else the reader can see. */}
            {trackLabel ? (
              <span
                title={trackLabel}
                className="min-w-0 truncate font-mono text-[0.6875rem] uppercase tracking-[0.1em] text-[var(--chart-2)]"
              >
                {trackLabel}
              </span>
            ) : (
              <span aria-hidden />
            )}

            <span className="flex shrink-0 items-center gap-1.5">
              <a
                href={courseHref(course.code, fromPath)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground/70 transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring group-hover:text-muted-foreground"
                aria-label={`Open ${course.code} details`}
                onClick={(event) => event.stopPropagation()}
              >
                <ExternalLink className="h-4 w-4" />
              </a>
              <Button
                variant="ghost"
                size="iconSm"
                // Clicking the card opens the course page, so the toggle must not bubble.
                onClick={(event) => {
                  event.stopPropagation();
                  onTogglePassed(course.code);
                }}
                title={manuallyPassed ? "Mark as not taken" : "Mark as passed"}
                aria-label={manuallyPassed ? "Mark as not taken" : "Mark as passed"}
                aria-pressed={manuallyPassed}
                className="shrink-0"
              >
                {StatusIcon && status ? (
                  <StatusIcon className="h-4 w-4" style={{ color: STATUS_STYLE[status].color }} />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground/50" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="iconSm"
                onClick={(event) => {
                  event.stopPropagation();
                  onPinHelp(course.code);
                }}
                onMouseEnter={() => onOpenHelp(course.code)}
                aria-label={`Requirements for ${course.code}`}
                aria-expanded={helpOpen}
                className="shrink-0 text-muted-foreground/70 group-hover:text-muted-foreground"
              >
                <HelpCircle className="h-4 w-4" />
              </Button>
            </span>
          </div>
        </div>

        <Handle
          type="source"
          position={outgoing}
          className="!h-1.5 !w-1.5 !border-0 !bg-border"
        />
      </div>

      {helpOpen ? (
        // Spans the card's full height, not just the panel's: the control that opens it
        // sits at the card's foot, and bare canvas on the way over fired the close timer.
        <div className="animate-popover-in absolute left-full top-0 z-50 h-full pl-2">
          <CourseRequirementsPopover
            course={course}
            requires={requires}
            unlocks={unlocks}
            fromPath={fromPath}
          />
        </div>
      ) : null}
    </div>
  );
}

export default React.memo(ProgramCourseNode);
