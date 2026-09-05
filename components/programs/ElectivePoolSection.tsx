"use client";

import React, { useMemo, useState } from "react";
import { ExternalLink, Search } from "lucide-react";
import type { ElectivePool } from "@/lib/programs/layout";
import { courseHref } from "@/lib/programs/format";
import { CATEGORY_STYLE } from "./constants";

/**
 * The free-elective pools listed in full: on the canvas they are one card, but choosing
 * between dozens of courses is a real decision and needs room to search and sort.
 */
export default function ElectivePoolSection({
  pools,
  id,
  fromPath,
}: {
  pools: ElectivePool[];
  id: string;
  fromPath?: string;
}) {
  const [query, setQuery] = useState("");

  const all = useMemo(
    () =>
      pools
        .flatMap((pool) => pool.courses.map((course) => ({ course, semester: pool.semester })))
        .sort((a, b) =>
          (a.course.titleEn || a.course.titleSv).localeCompare(b.course.titleEn || b.course.titleSv)
        ),
    [pools]
  );

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return all;
    return all.filter(({ course }) =>
      `${course.code} ${course.titleEn} ${course.titleSv} ${course.mainFieldEn ?? ""}`
        .toLowerCase()
        .includes(needle)
    );
  }, [all, query]);

  if (all.length === 0) return null;

  const semesters = [...new Set(pools.map((p) => p.semester))].sort((a, b) => a - b);

  return (
    <section id={id} className="scroll-mt-24 rounded-lg border border-border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          {/* Set like every other section heading on this page, so the map, the rules
              and the pool read as three parts of one document. */}
          <h2 className="flex items-center gap-2 font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground">
            <span
              aria-hidden
              className="h-2.5 w-2.5 rounded-sm"
              style={{ backgroundColor: CATEGORY_STYLE.OPTIONAL_ELECTIVE.color }}
            />
            Free electives
          </h2>
          <p className="mt-2 max-w-[62ch] text-[0.9375rem] leading-relaxed text-muted-foreground">
            {all.length} optional courses offered in semester
            {semesters.length > 1 ? "s" : ""} {semesters.join(", ")}. Choose the ones that
            make up your remaining credits.
          </p>
        </div>

        <label className="relative">
          <span className="sr-only">Search free electives</span>
          <Search
            aria-hidden
            className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filter by name, code or field"
            className="w-full rounded-md border border-border bg-background py-2 pl-8 pr-3 text-[0.9375rem] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring sm:w-64"
          />
        </label>
      </div>

      {matches.length === 0 ? (
        <p className="mt-6 rounded-md border border-dashed border-border px-4 py-8 text-center text-[0.9375rem] text-muted-foreground">
          No elective matches &ldquo;{query}&rdquo;.
        </p>
      ) : (
        // Rows on hairlines rather than 50-odd bordered tiles: at this count the
        // borders out-shouted the course titles they were meant to frame.
        <ul className="mt-5 grid gap-x-6 border-t border-border sm:grid-cols-2 xl:grid-cols-3">
          {matches.map(({ course }) => (
            // Grid items default to `min-width: auto`, so the widest title pushed the page
            // 700px wider than the phone; min-w-0 lets the row shrink and truncate.
            <li key={course.code} className="min-w-0 border-b border-border">
              <a
                href={courseHref(course.code, fromPath)}
                className="group flex h-full items-start justify-between gap-2 rounded-sm px-2 py-2.5 transition-colors hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="min-w-0">
                  <span className="block text-[0.9375rem] font-medium leading-tight text-foreground">
                    {course.titleEn || course.titleSv}
                  </span>
                  <span className="mt-1 block truncate font-mono text-[0.6875rem] tracking-[0.1em] text-muted-foreground">
                    {course.credits ?? "?"} hp
                    <span className="mx-1.5 opacity-40">•</span>
                    {course.code}
                    {course.mainFieldEn ? (
                      <>
                        <span className="mx-1.5 opacity-40">•</span>
                        {course.mainFieldEn}
                      </>
                    ) : null}
                  </span>
                </span>
                <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
