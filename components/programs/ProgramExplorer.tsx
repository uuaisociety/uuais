"use client";

import React, { Suspense, useCallback, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { usePathname, useSearchParams } from "next/navigation";
import type {
  ProgramCourse,
  ProgramEdge,
  ProgramRule,
  ProgramSpecialisation,
  ProgramTrack,
} from "@/lib/programs";
import {
  getVisibleCourses,
  getVisibleEdges,
  getVisibleRules,
} from "@/lib/programs/select";
import { partitionElectivePools } from "@/lib/programs/layout";
import { deriveStatuses, summarise } from "@/lib/programs/status";
import {
  getManualPassedServerSnapshot,
  getManualPassedSnapshot,
  saveManualPassed,
  subscribeManualPassed,
} from "@/lib/programs/manual";
import { useProgramProgressSync } from "@/hooks/useProgramProgressSync";
import ProgramSidebar, { type ProgramSummary } from "./ProgramSidebar";
import ProgramRules from "./ProgramRules";
import ElectivePoolSection from "./ElectivePoolSection";
import { TRACK_PICKER_ID } from "./TrackPicker";
import { MAP_PANE_HEIGHT } from "./constants";
import type { SemesterGap } from "./ProgramCanvas";

/**
 * Holds the map's exact chrome and footprint while it loads, so the page does not reflow
 * around it and the reader can already see what is arriving.
 */
function CanvasSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-card" aria-busy>
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <span aria-hidden className="h-3 w-56 max-w-[50%] rounded-sm bg-muted" />
        <span aria-hidden className="h-6 w-40 rounded-md bg-muted" />
      </div>
      <div className="flex gap-4 overflow-hidden p-4" style={{ height: MAP_PANE_HEIGHT }}>
        {[0, 1, 2, 3].map((column) => (
          <span
            key={column}
            aria-hidden
            className="h-full flex-1 animate-pulse rounded-lg bg-muted/50"
            style={{ animationDelay: `${column * 90}ms` }}
          />
        ))}
      </div>
      <span className="sr-only">Loading the course map</span>
    </div>
  );
}

// reactflow measures the DOM, so the canvas is client-only.
const ProgramCanvas = dynamic(() => import("./ProgramCanvas"), { loading: CanvasSkeleton });

const ELECTIVES_ID = "free-electives";

/**
 * Owns what the map and the panels around it share: progress lives here rather than in the
 * canvas because the sidebar's donut and the cards' status icons are one fact shown twice.
 */
type ExplorerProps = {
  program: ProgramSummary;
  specialisations: ProgramSpecialisation[];
  /** The whole programme: the track filter runs here, not on the server. */
  courses: ProgramCourse[];
  tracks: ProgramTrack[];
  edges: ProgramEdge[];
  rules: ProgramRule[];
};

/**
 * `useSearchParams` opts a subtree out of prerendering, so it lives behind its own boundary:
 * the page around it stays static and only the filter waits for the URL. The fallback must not
 * suspend — React cannot use a fallback that does, and escalates the bailout to the route
 * boundary, prerendering the whole page as an empty shell. Hence the skeleton in place of the
 * lazily loaded canvas: everything else here renders, and only the map waits.
 */
export default function ProgramExplorer(props: ExplorerProps) {
  return (
    <Suspense fallback={<ExplorerBody {...props} selectedTrack={null} deferCanvas />}>
      <TrackedExplorer {...props} />
    </Suspense>
  );
}

function TrackedExplorer(props: ExplorerProps) {
  const params = useSearchParams();
  const requested = params.get("track");
  // An unknown track falls back to the trunk rather than an empty canvas.
  const selectedTrack = props.tracks.some((t) => t.id === requested) ? requested : null;
  return <ExplorerBody {...props} selectedTrack={selectedTrack} />;
}

function ExplorerBody({
  program,
  specialisations,
  selectedTrack,
  courses: allCourses,
  tracks,
  edges: allEdges,
  rules: allRules,
  deferCanvas = false,
}: ExplorerProps & { selectedTrack: string | null; deferCanvas?: boolean }) {
  const [selected, setSelected] = useState<string | null>(null);
  const electivesRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  const courses = useMemo(
    () => getVisibleCourses({ courses: allCourses, tracks }, selectedTrack),
    [allCourses, tracks, selectedTrack]
  );
  const edges = useMemo(() => getVisibleEdges(allEdges, courses), [allEdges, courses]);
  const rules = useMemo(
    () => getVisibleRules({ rules: allRules }, selectedTrack),
    [allRules, selectedTrack]
  );

  // Read through a subscription rather than an effect, so the server render sees an
  // empty set and the browser picks up the stored marks without a second paint.
  const manualPassed = React.useSyncExternalStore(
    subscribeManualPassed,
    () => getManualPassedSnapshot(program.code),
    getManualPassedServerSnapshot
  );

  // Signed in, the marks follow the student to their other devices; signed out they
  // stay in this browser and nothing about this call changes that.
  useProgramProgressSync(program.code);

  const togglePassed = useCallback(
    (code: string) => {
      const next = new Set(getManualPassedSnapshot(program.code));
      if (next.has(code)) next.delete(code);
      else next.add(code);
      saveManualPassed(program.code, next);
    },
    [program.code]
  );

  const clearMarks = useCallback(
    () => saveManualPassed(program.code, new Set()),
    [program.code]
  );

  /** Ticking a prerequisite promotes whatever it unlocks to "upcoming". */
  const statuses = useMemo(
    () =>
      manualPassed.size === 0
        ? null
        : deriveStatuses(courses, edges, new Set(manualPassed), new Set()),
    [manualPassed, courses, edges]
  );

  const progress = useMemo(
    () => (statuses ? summarise(courses, statuses) : null),
    [statuses, courses]
  );

  // Split here rather than inside the canvas so the map's summary card and the full
  // list below are always describing the same set of courses.
  const { laidOut, pools } = useMemo(() => partitionElectivePools(courses), [courses]);

  const openPool = useCallback(() => {
    electivesRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  /** The map's gap marker offers the choice; the picker that makes it is in the sidebar. */
  const focusTrackPicker = useCallback(() => {
    const picker = document.getElementById(TRACK_PICKER_ID);
    if (!picker) return;
    picker.scrollIntoView({ behavior: "smooth", block: "center" });
    picker.focus({ preventScroll: true });
  }, []);

  const trackLabel = useMemo(() => {
    const track = tracks.find((t) => t.id === selectedTrack);
    // The bare specialisation and its profiles share one name, and it is the name the
    // reader picked from; the profile is already spelled out in the picker itself.
    return track ? track.specialisationSv : null;
  }, [tracks, selectedTrack]);

  /**
   * Semesters this view has no courses for: where the trunk jumps from semester 6 to the
   * thesis, an unmarked stretch reads as data that simply stops.
   */
  const gaps = useMemo<SemesterGap[]>(() => {
    const present = new Set(courses.map((c) => c.semester));
    if (present.size === 0) return [];
    const lastVisible = Math.max(...present);
    const trackTaught = new Set(
      allCourses.filter((c) => c.trackId !== null).map((c) => c.semester)
    );
    const anyTaught = new Set(allCourses.map((c) => c.semester));

    const result: SemesterGap[] = [];
    for (let semester = 1; semester <= program.semesters; semester += 1) {
      if (present.has(semester)) continue;
      const gated = trackTaught.has(semester);
      // Past the end of what this view shows, only a specialisation is worth marking:
      // a plan that lists nothing beyond its last taught semester has nothing to say.
      if (semester > lastVisible && !gated) continue;
      result.push({
        semester,
        reason: !anyTaught.has(semester)
          ? "empty"
          : gated
            ? selectedTrack
              ? "other-track"
              : "track"
            : "empty",
      });
    }
    return result;
  }, [courses, allCourses, program.semesters, selectedTrack]);

  /** Marks every course link with the map it was opened from, so the course page can come back. */
  const fromPath = `${pathname}${selectedTrack ? `?track=${selectedTrack}` : ""}`;

  const selectedCourse = selected
    ? (courses.find((course) => course.code === selected) ?? null)
    : null;
  const matching = selected ? rules.filter((rule) => rule.courseCodes.includes(selected)) : rules;

  return (
    <div className="grid gap-8 lg:grid-cols-[17rem_minmax(0,1fr)]">
      <ProgramSidebar
        program={program}
        specialisations={specialisations}
        selectedTrack={selectedTrack}
        progress={progress}
        markedCount={manualPassed.size}
        onClearMarks={clearMarks}
      />

      <div className="min-w-0 space-y-6">
        {deferCanvas ? (
          <CanvasSkeleton />
        ) : (
        <ProgramCanvas
          courses={laidOut}
          pools={pools}
          onOpenPool={openPool}
          edges={edges}
          rules={rules}
          statuses={statuses}
          manualPassed={manualPassed}
          onTogglePassed={togglePassed}
          selected={selected}
          onSelect={setSelected}
          gaps={gaps}
          trackId={selectedTrack}
          trackLabel={trackLabel}
          onChooseTrack={focusTrackPicker}
          fromPath={fromPath}
        />
        )}

        {rules.length > 0 ? (
          <ProgramRules
            rules={matching}
            selectedCode={selected}
            selectedTitle={selectedCourse?.titleEn || selectedCourse?.titleSv || null}
            totalRules={rules.length}
            onClearSelection={() => setSelected(null)}
            fromPath={fromPath}
          />
        ) : null}

        <div ref={electivesRef}>
          <ElectivePoolSection pools={pools} id={ELECTIVES_ID} fromPath={fromPath} />
        </div>
      </div>
    </div>
  );
}
