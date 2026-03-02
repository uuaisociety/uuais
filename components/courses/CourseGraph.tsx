"use client";

import { useMemo } from "react";
import type { Course } from "@/lib/courses";

type Props = { courses: Course[]; focusId?: string };

export default function CourseGraph({ courses, focusId }: Props) {
  const { nodes, links } = useMemo(() => {
    const radius = 140;
    const cx = 200;
    const cy = 160;
    const nodes = courses.map((c, i) => {
      const angle = (i / Math.max(1, courses.length)) * Math.PI * 2;
      return { id: c.id, x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle), label: c.title };
    });
    const nodeIndex = Object.fromEntries(nodes.map((n, i) => [n.id, i]));
    const links: { source: string; target: string }[] = [];
    courses.forEach((c) => {
      c.relatedCourses.forEach((r) => {
        if (nodeIndex[c.id] !== undefined && nodeIndex[r] !== undefined) links.push({ source: c.id, target: r });
      });
    });
    return { nodes, links };
  }, [courses]);

  return (
    <div className="w-full overflow-x-auto">
      <svg width={400} height={320} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg">
        {links.map((l, idx) => {
          const s = nodes.find((n) => n.id === l.source);
          const t = nodes.find((n) => n.id === l.target);
          if (!s || !t) return null;
          return <line key={idx} x1={s.x} y1={s.y} x2={t.x} y2={t.y} stroke="#d1d5db" strokeWidth={1} />;
        })}
        {nodes.map((n) => {
          const isFocus = n.id === focusId;
          return (
            <g key={n.id}>
              <circle cx={n.x} cy={n.y} r={isFocus ? 12 : 8} fill={isFocus ? "#990000" : "#ef4444"} opacity={isFocus ? 0.9 : 0.8} />
              <title>{n.label}</title>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
