import React from "react";
import { STATUS_STYLE } from "./constants";
import type { CourseStatus } from "@/lib/programs/status";

const ORDER: CourseStatus[] = ["COMPLETED", "IN_PROGRESS", "UPCOMING", "NOT_STARTED"];
const LABELS: Record<CourseStatus, string> = {
  COMPLETED: "Completed",
  IN_PROGRESS: "In progress",
  UPCOMING: "Upcoming",
  NOT_STARTED: "Remaining",
};

const RADIUS = 30;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function ProgressDonut({
  percent,
  counts,
}: {
  percent: number;
  counts: Record<CourseStatus, number>;
}) {
  return (
    <div className="flex items-center gap-4">
      <div className="relative shrink-0">
        <svg width="76" height="76" viewBox="0 0 76 76" aria-hidden>
          <circle
            cx="38"
            cy="38"
            r={RADIUS}
            fill="none"
            stroke="var(--muted)"
            strokeWidth="8"
          />
          <circle
            cx="38"
            cy="38"
            r={RADIUS}
            fill="none"
            stroke={STATUS_STYLE.COMPLETED.color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${(percent / 100) * CIRCUMFERENCE} ${CIRCUMFERENCE}`}
            transform="rotate(-90 38 38)"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {/* A measured value, so it is set in mono like every other number here. */}
          <span className="font-mono text-sm font-semibold leading-none text-foreground">
            {percent}%
          </span>
          <span className="mt-1 font-mono text-[0.6875rem] uppercase tracking-[0.1em] leading-none text-muted-foreground">
            done
          </span>
        </div>
      </div>

      <dl className="min-w-0 flex-1 space-y-1">
        {ORDER.map((status) => (
          <div key={status} className="flex items-center justify-between gap-2 text-xs">
            <dt className="flex items-center gap-1.5 truncate text-muted-foreground">
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: STATUS_STYLE[status].color }}
              />
              {LABELS[status]}
            </dt>
            <dd className="font-mono text-foreground">{counts[status]}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
