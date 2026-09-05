"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { ArrowRight, GraduationCap, Search } from "lucide-react";
import type { ProgramIndexEntry } from "@/lib/programs";
import {
  foldForSearch,
  includesWithinOneEdit,
  programDisplayNames,
} from "@/lib/programs/format";

/** Groups the list the way the university's own catalogue reads. */
const GROUPS: { label: string; match: RegExp }[] = [
  { label: "Civilingenjör", match: /^Civilingenj/ },
  { label: "Högskoleingenjör", match: /^Högskoleingenj/ },
  { label: "Bachelor's", match: /^Kandidatprogram/ },
  { label: "Master's", match: /^(Master|Magister)program/ },
  { label: "Foundation year", match: /^Teknisk|^Tekniskt/ },
];

type Row = ProgramIndexEntry & { slug: string };

export default function ProgramFinder({ programmes }: { programmes: Row[] }) {
  const [query, setQuery] = useState("");
  const [faculty, setFaculty] = useState("");

  const faculties = useMemo(
    () => [...new Set(programmes.map((p) => p.faculty))].sort((a, b) => a.localeCompare(b, "sv")),
    [programmes]
  );

  /** The search runs within the chosen faculty, so the count beneath it means what it says. */
  const scoped = useMemo(
    () => (faculty ? programmes.filter((p) => p.faculty === faculty) : programmes),
    [programmes, faculty]
  );

  // Folded once per list rather than per keystroke: the search runs over the Swedish
  // title, UU's English one and the code, so a reader may type either language.
  const haystacks = useMemo(
    () =>
      scoped.map((p) =>
        foldForSearch(
          `${p.programmeTitle} ${p.programmeTitleEn ?? ""} ${p.nameSv} ${p.code}`
        )
      ),
    [scoped]
  );

  const matches = useMemo(() => {
    const needle = foldForSearch(query);
    if (!needle) return scoped;
    const exact = scoped.filter((_, index) => haystacks[index].includes(needle));
    // A typo otherwise empties the page, so a one-edit pass runs only when nothing matched
    // outright; short needles are left alone, where one edit is most of the word.
    if (exact.length > 0 || needle.length < 4) return exact;
    return scoped.filter((_, index) =>
      includesWithinOneEdit(haystacks[index], needle)
    );
  }, [scoped, haystacks, query]);

  const grouped = useMemo(() => {
    const groups = GROUPS.map((group) => ({
      label: group.label,
      items: matches.filter((p) => group.match.test(p.programmeTitle)),
    })).filter((group) => group.items.length > 0);
    const claimed = new Set(groups.flatMap((g) => g.items));
    const rest = matches.filter((p) => !claimed.has(p));
    return rest.length > 0 ? [...groups, { label: "Other", items: rest }] : groups;
  }, [matches]);

  return (
    <>
      <label className="relative mt-10 block max-w-md">
        <span className="sr-only">Search programmes</span>
        <Search
          aria-hidden
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by name or code — e.g. physics, fysik, TTF2Y"
          className="w-full rounded-md border border-border bg-card py-2.5 pl-9 pr-3 text-[0.9375rem] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </label>

      <label className="mt-3 block max-w-md">
        <span className="sr-only">Filter by faculty</span>
        <select
          value={faculty}
          onChange={(event) => setFaculty(event.target.value)}
          className="w-full rounded-md border border-border bg-card px-3 py-2 text-[0.9375rem] text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">Every faculty</option>
          {faculties.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </label>

      <p
        aria-live="polite"
        className="mt-2.5 font-mono text-[0.6875rem] uppercase tracking-[0.1em] text-muted-foreground"
      >
        {matches.length} of {scoped.length} programmes
      </p>

      {matches.length === 0 ? (
        <div className="mt-10 rounded-lg border border-dashed border-border px-5 py-10 text-center">
          <p className="text-[0.9375rem] text-foreground">
            No programme matches &ldquo;{query}&rdquo;.
          </p>
          <p className="mt-1.5 text-[0.9375rem] text-muted-foreground">
            Try a programme code such as TTF2Y, or a subject like fysik.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setQuery("")}
            className="mt-4 font-mono text-[0.6875rem] uppercase tracking-[0.12em]"
          >
            Clear search
          </Button>
        </div>
      ) : null}

      {/* A hairline-divided list rather than 77 identical boxes: at this length the card
          borders were the loudest thing on the page and the row content the quietest. */}
      {grouped.map((group) => (
        <section key={group.label} className="mt-10">
          <h2 className="flex items-baseline gap-3 font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground">
            {group.label}
            <span className="opacity-60">{group.items.length}</span>
            <span aria-hidden className="h-px min-w-6 flex-1 bg-border" />
          </h2>
          <ul className="mt-1 divide-y divide-border border-b border-border">
            {group.items.map((program) => {
              // The site reads in English, so the English name leads and the
              // university's Swedish title sits beneath it.
              const { primary, secondary } = programDisplayNames(
                program.programmeTitle,
                program.programmeTitleEn
              );
              return (
                <li key={program.file}>
                  <Link
                    href={`/programs/${program.slug}`}
                    className="group flex items-center justify-between gap-4 rounded-sm px-2 py-3.5 transition-colors hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className="flex min-w-0 items-start gap-3">
                      <GraduationCap className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" />
                      <span className="min-w-0">
                        <span className="block truncate text-[0.9375rem] font-medium text-foreground">
                          {primary}
                        </span>
                        {secondary ? (
                          <span className="mt-0.5 block truncate text-[0.9375rem] text-muted-foreground">
                            {secondary}
                          </span>
                        ) : null}
                        <span className="mt-1 block font-mono text-[0.6875rem] text-muted-foreground">
                          {program.code}
                          <span className="mx-1.5 opacity-40">•</span>
                          {program.totalCredits} hp
                          <span className="mx-1.5 opacity-40">•</span>
                          {program.courses > 0 ? `${program.courses} courses` : "no course list"}
                          {program.tracks > 0 ? (
                            <>
                              <span className="mx-1.5 opacity-40">•</span>
                              {program.tracks} specialisations
                            </>
                          ) : null}
                          {program.validFromYear ? (
                            <>
                              <span className="mx-1.5 opacity-40">•</span>
                              from {program.validFromYear}
                            </>
                          ) : null}
                        </span>
                      </span>
                    </span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground/60 transition-all group-hover:translate-x-0.5 group-hover:text-foreground" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </>
  );
}
