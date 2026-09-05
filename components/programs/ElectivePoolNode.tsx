"use client";

import React from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import { ArrowDown } from "lucide-react";
import type { ProgramCourse } from "@/lib/programs";
import { Button } from "@/components/ui/Button";
import { CATEGORY_STYLE } from "./constants";

export type ElectivePoolData = {
  semester: number;
  courses: ProgramCourse[];
  onOpen: () => void;
};

/**
 * Stands in for a semester's pool of free electives: drawn individually they would make the
 * column an order of magnitude taller than any other and force the whole map to zoom out.
 */
function ElectivePoolNode({ data }: NodeProps<ElectivePoolData>) {
  const { courses, onOpen } = data;
  const credits = courses.reduce((sum, course) => sum + (course.credits ?? 0), 0);

  return (
    <div className="h-full w-full overflow-hidden rounded-md border border-dashed border-border bg-card">
      <Handle type="target" position={Position.Left} className="!h-1.5 !w-1.5 !border-0 !bg-border" />

      <Button
        variant="bare"
        size="none"
        onClick={onOpen}
        className="h-full w-full flex-col items-stretch justify-between whitespace-normal px-3 py-2.5 text-left hover:bg-accent/40"
      >
        <span className="flex items-start gap-2">
          <span
            aria-hidden
            className="mt-0.5 h-2 w-2 shrink-0 rounded-sm"
            style={{ backgroundColor: CATEGORY_STYLE.OPTIONAL_ELECTIVE.color }}
          />
          <span className="min-w-0">
            <span className="block text-[0.9375rem] font-semibold leading-tight text-foreground">
              Free electives
            </span>
            <span className="mt-0.5 block font-mono text-[0.6875rem] leading-tight text-muted-foreground">
              {courses.length} to choose from
            </span>
          </span>
        </span>

        <span className="mt-2 flex items-center justify-between gap-2">
          <span className="font-mono text-[0.6875rem] tracking-[0.1em] text-muted-foreground">
            {credits} hp offered
          </span>
          <span className="inline-flex items-center gap-1 text-[0.6875rem] font-medium text-foreground">
            See list
            <ArrowDown className="h-3 w-3" />
          </span>
        </span>
      </Button>

      <Handle type="source" position={Position.Right} className="!h-1.5 !w-1.5 !border-0 !bg-border" />
    </div>
  );
}

export default React.memo(ElectivePoolNode);
