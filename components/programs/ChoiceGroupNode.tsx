"use client";

import React from "react";
import type { NodeProps } from "reactflow";

export type ChoiceGroupData = {
  label: string;
  width: number;
  height: number;
};

/** Outlines courses the plan says you pick between, so the either/or reads as one decision. */
function ChoiceGroupNode({ data }: NodeProps<ChoiceGroupData>) {
  return (
    <div
      className="pointer-events-none select-none rounded-lg border border-dashed border-[var(--chart-2)]/60 bg-[var(--chart-2)]/[0.06]"
      style={{ width: data.width, height: data.height }}
    >
      <span className="absolute -top-2 left-2 rounded-sm bg-card px-1.5 font-mono text-[0.6875rem] uppercase tracking-[0.1em] text-[var(--chart-2)]">
        {data.label}
      </span>
    </div>
  );
}

export default React.memo(ChoiceGroupNode);
