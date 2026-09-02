"use client";

import React from "react";
import type { NodeProps } from "reactflow";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/Button";

export type PeriodBandData = {
  semester: number;
  credits: number;
  periods: string[];
  orientation: "horizontal" | "vertical";
  collapsed: boolean;
  hiddenCount: number;
  /** The specialisation this whole semester belongs to, when one does. */
  trackLabel?: string | null;
  /** Width of the label rail in the vertical layout, matching the node's x offset. */
  railWidth: number;
  onToggle: () => void;
};

const shortPeriod = (period: string) => period.replace(/^Period\s*/, "P");

/**
 * Groups a semester's periods so the wider gap between bands marks the semester break. The
 * orientations need different furniture: a header strip does not survive being rotated.
 */
function PeriodBandNode({ data }: NodeProps<PeriodBandData>) {
  const Chevron = data.collapsed ? ChevronRight : ChevronDown;

  const toggle = (
    <Button
      variant="bare"
      size="none"
      onClick={data.onToggle}
      aria-expanded={!data.collapsed}
      title={data.collapsed ? "Expand semester" : "Collapse semester"}
      className="pointer-events-auto -m-1 flex h-auto min-w-0 items-center justify-start gap-1 rounded px-1 py-1.5 text-foreground hover:text-foreground/70"
    >
      <Chevron className="h-3 w-3 shrink-0 opacity-60" />
      <span className="truncate text-[0.9375rem] font-semibold leading-none">
        Semester {data.semester}
      </span>
    </Button>
  );

  const track = data.trackLabel ? (
    <span className="min-w-0 truncate font-mono text-[0.6875rem] uppercase tracking-[0.1em] text-[var(--chart-2)]">
      {data.trackLabel}
    </span>
  ) : null;

  const hidden = (
    <span className="font-mono text-[0.6875rem] uppercase tracking-[0.1em] text-muted-foreground">
      {data.hiddenCount} course{data.hiddenCount === 1 ? "" : "s"} hidden
    </span>
  );

  if (data.orientation === "vertical") {
    return (
      <div className="pointer-events-none flex h-full w-full select-none overflow-hidden rounded-lg border border-border bg-muted/40">
        {/* In the offset gutter: never covers a card, wide enough to spell the semester out. */}
        <div
          className="relative flex shrink-0 flex-col justify-start gap-1 border-r border-border px-2.5 py-2"
          style={{ width: data.railWidth }}
        >
          {toggle}
          <span className="font-mono text-[0.6875rem] leading-none text-muted-foreground">
            {data.credits} hp
          </span>
          {track}

          {/* In the rail, not the slab the first card covers; centred on the stretch it names. */}
          {!data.collapsed &&
            data.periods.map((period, index) => (
              <span
                key={period}
                className="absolute left-2.5 right-2.5 -translate-y-1/2 truncate font-mono text-[0.6875rem] uppercase tracking-[0.1em] text-muted-foreground"
                style={{ top: `${((index + 0.5) / data.periods.length) * 100}%` }}
              >
                {period}
              </span>
            ))}
        </div>

        {data.collapsed ? (
          <div className="flex items-center px-3">{hidden}</div>
        ) : (
          <div className="flex min-w-0 flex-1 flex-col">
            {data.periods.map((period) => (
              <div
                key={period}
                className="flex-1 border-b border-dashed border-border last:border-b-0"
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="pointer-events-none h-full w-full select-none overflow-hidden rounded-lg border border-border bg-muted/40">
      <div className="flex items-baseline justify-between gap-2 border-b border-border px-2 py-2">
        <span className="flex min-w-0 items-baseline gap-2.5">
          {toggle}
          {track}
        </span>
        <span className="shrink-0 font-mono text-[0.6875rem] leading-none text-muted-foreground">
          {data.credits} hp
        </span>
      </div>

      {data.collapsed ? (
        <Button
          variant="bare"
          size="none"
          onClick={data.onToggle}
          className="pointer-events-auto h-auto w-full justify-start px-2 py-2 text-left"
        >
          {hidden}
        </Button>
      ) : (
        <div className="flex">
          {data.periods.map((period) => (
            <div
              key={period}
              className="flex-1 border-r border-dashed border-border px-2 py-1 text-center last:border-r-0"
            >
              <span className="font-mono text-[0.6875rem] uppercase tracking-[0.1em] text-muted-foreground">
                {shortPeriod(period)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default React.memo(PeriodBandNode);
