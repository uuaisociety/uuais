import React from "react";
import { CATEGORY_STYLE, EDGE_STYLE } from "./constants";
import type { ProgramCourseCategory, ProgramEdgeType } from "@/lib/programs";

const CATEGORIES = Object.keys(CATEGORY_STYLE) as ProgramCourseCategory[];
const EDGES = Object.keys(EDGE_STYLE) as ProgramEdgeType[];

function EdgeSample({ type }: { type: ProgramEdgeType }) {
  return (
    <svg width="44" height="8" viewBox="0 0 44 8" aria-hidden className="shrink-0">
      <defs>
        <marker id={`legend-${type}`} markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto">
          <path d="M0,0 L5,2.5 L0,5 z" fill={EDGE_STYLE[type].color} />
        </marker>
      </defs>
      <line
        x1="0"
        y1="4"
        x2="36"
        y2="4"
        stroke={EDGE_STYLE[type].color}
        strokeWidth="1.5"
        strokeDasharray={EDGE_STYLE[type].dash}
        markerEnd={`url(#legend-${type})`}
      />
    </svg>
  );
}

/** The compact legend shown in the sidebar. */
export function SidebarLegend() {
  return (
    <div>
      <p className="font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground">
        Legend
      </p>
      <ul className="mt-3 space-y-3">
        {CATEGORIES.map((key) => (
          <li key={key} className="flex gap-2.5">
            <span
              className="mt-[0.3125rem] h-2.5 w-2.5 shrink-0 rounded-sm"
              style={{ backgroundColor: CATEGORY_STYLE[key].color }}
            />
            <span className="min-w-0">
              <span className="block text-[0.9375rem] font-medium leading-tight text-foreground">
                {CATEGORY_STYLE[key].label}
              </span>
              <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">
                {CATEGORY_STYLE[key].description}
              </span>
            </span>
          </li>
        ))}
      </ul>
      <ul className="mt-4 space-y-3 border-t border-border pt-4 text-muted-foreground">
        {EDGES.map((key) => (
          <li key={key} className="flex gap-2.5">
            <span className="mt-2 shrink-0 text-foreground">
              <EdgeSample type={key} />
            </span>
            <span className="min-w-0">
              <span className="block text-[0.9375rem] font-medium leading-tight text-foreground">
                {EDGE_STYLE[key].label}
              </span>
              <span className="mt-0.5 block text-xs leading-snug">
                {EDGE_STYLE[key].description}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
