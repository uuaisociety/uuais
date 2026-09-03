"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  ControlButton,
  MarkerType,
  Position as PositionEnum,
  ReactFlowProvider,
  getNodesBounds,
  useNodesInitialized,
  useReactFlow,
  useStore,
  type Edge,
  type FitViewOptions,
  type Node,
  type ReactFlowInstance,
  type ReactFlowState,
} from "reactflow";
import "reactflow/dist/style.css";
import { useRouter } from "next/navigation";
import {
  CheckCheck,
  Columns3,
  Map as MapIcon,
  Maximize2,
  Minimize2,
  RotateCcw,
  Rows3,
} from "lucide-react";
import type { ProgramCourse, ProgramEdge, ProgramRule } from "@/lib/programs";
import type { CourseStatus } from "@/lib/programs/status";
import {
  ROW_GAP,
  layoutProgram,
  type ElectivePool,
  type Orientation,
} from "@/lib/programs/layout";
import { computeHighlight, edgeKey } from "@/lib/programs/highlight";
import { courseHref } from "@/lib/programs/format";
import { Button } from "@/components/ui/Button";
import type { RequirementLink } from "./CourseRequirementsPopover";
import ProgramCourseNode, { type ProgramCourseNodeData } from "./ProgramCourseNode";
import PeriodBandNode, { type PeriodBandData } from "./PeriodBandNode";
import ChoiceGroupNode, { type ChoiceGroupData } from "./ChoiceGroupNode";
import ElectivePoolNode, { type ElectivePoolData } from "./ElectivePoolNode";
import SemesterGapNode, {
  type SemesterGapData,
  type SemesterGapReason,
} from "./SemesterGapNode";
import { EDGE_STYLE, MAP_PANE_HEIGHT } from "./constants";

/** A semester this view holds no courses for, and why. */
export type SemesterGap = { semester: number; reason: SemesterGapReason };

type Props = {
  /** Courses to place individually; pooled electives are handled separately. */
  courses: ProgramCourse[];
  pools: ElectivePool[];
  /** Called when the reader asks to see a pool's full list. */
  onOpenPool: () => void;
  edges: ProgramEdge[];
  rules: ProgramRule[];
  statuses: Record<string, CourseStatus> | null;
  manualPassed: Set<string>;
  onTogglePassed: (code: string) => void;
  /** Notified when the reader picks a course, so the rules panel can follow. */
  onSelect?: (code: string | null) => void;
  selected?: string | null;
  /** Semesters with no courses in this view, so the gap can be marked rather than skipped. */
  gaps?: SemesterGap[];
  /** The chosen specialisation: its id drives the reveal, its name labels its courses. */
  trackId?: string | null;
  trackLabel?: string | null;
  /** Sends the reader to the specialisation picker in the sidebar. */
  onChooseTrack?: () => void;
  /** Stamped on every course link so the course page can offer the way back to this map. */
  fromPath?: string;
};

const nodeTypes = {
  programCourse: ProgramCourseNode,
  periodBand: PeriodBandNode,
  choiceGroup: ChoiceGroupNode,
  electivePool: ElectivePoolNode,
  semesterGap: SemesterGapNode,
};

const PRO_OPTIONS = { hideAttribution: true };

/** Node ids are per-placement; the code lives in the node's data. */
/** Target for the skip link, so the keyboard can step past every card in one press. */
const PAST_MAP_ID = "past-course-map";

function courseCodeOf(node: Node): string | null {
  return (node.data as ProgramCourseNodeData | undefined)?.course?.code ?? null;
}

/**
 * Twenty period columns cannot fit legibly, so the horizontal fit is floored and panned;
 * the vertical view is scrolled through, so it may zoom out to show the shape.
 */
const FIT_VIEW: Record<Orientation, FitViewOptions> = {
  // The in-card controls are 32px CSS, so below 0.75 they fall under the 24px WCAG 2.2
  // minimum once the canvas scale is applied; 0.85 leaves the titles readable, not just legal.
  horizontal: { minZoom: 0.85, maxZoom: 1, padding: 0.06 },
  vertical: { minZoom: 0.35, maxZoom: 1, padding: 0.06 },
};

/** Clearance above the first course row for the semester band's header and period strip. */
const BAND_HEADER = 64;
/**
 * Width of the vertical layout's label rail: it carries the semester name, its credits and
 * every period label beside the cards, which at the old 64px shrank to "Sem 4".
 */
const BAND_RAIL = 128;
const CHOICE_PADDING = 8;

/** Breathing room between the map's first course and the edge of the frame. */
const VIEW_PAD = 24;

/**
 * A phone fits about a semester and a half horizontally, so small screens open vertical —
 * read through a subscription, not an effect, so server render and first paint agree.
 */
const SMALL_SCREEN = "(max-width: 767px)";

function subscribeSmallScreen(onChange: () => void) {
  const query = window.matchMedia(SMALL_SCREEN);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

const smallScreenSnapshot = () => window.matchMedia(SMALL_SCREEN).matches;
/** Rendered on the server, where there is no screen to measure. */
const wideServerSnapshot = () => false;

/** The pane's measured width, which is 0 until React Flow has laid itself out. */
const paneWidth = (state: ReactFlowState) => state.width;

/**
 * Frames the map from its beginning: `fitView` centres what it cannot fit, so a wide map
 * opened mid-degree with its first year cropped off the left edge.
 */
function anchorView(
  instance: ReactFlowInstance,
  orientation: Orientation,
  /** Frame this node's start instead of the graph's, e.g. the first new semester. */
  anchorId?: string,
  animate = false
) {
  instance.fitView(FIT_VIEW[orientation]);
  const nodes = instance.getNodes();
  if (nodes.length === 0) return;
  const bounds = getNodesBounds(nodes);
  const { zoom } = instance.getViewport();
  const anchor = anchorId ? instance.getNode(anchorId) : undefined;
  const horizontal = orientation === "horizontal";
  // Only the time axis moves to the anchor: sliding the cross axis as well would
  // drop the reader into the middle of a stack of rows with no top edge in sight.
  const x = horizontal ? (anchor?.position.x ?? bounds.x) : bounds.x;
  const y = horizontal ? bounds.y : (anchor?.position.y ?? bounds.y);
  instance.setViewport(
    { x: VIEW_PAD - x * zoom, y: VIEW_PAD - y * zoom, zoom },
    animate && !prefersReducedMotion() ? { duration: 420 } : undefined
  );
}

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * Frames the map once the cards are measured; a change of `frameKey` then walks the view to
 * the first semester a newly chosen specialisation added, off the right-hand edge.
 */
function ViewAnchor({
  orientation,
  frameKey,
  anchorId,
}: {
  orientation: Orientation;
  frameKey: string;
  anchorId?: string;
}) {
  const instance = useReactFlow();
  const measured = useNodesInitialized();
  const width = useStore(paneWidth);
  const framed = useRef(false);
  const lastKey = useRef(frameKey);
  /** A re-frame that has been asked for but not yet drawn. */
  const pending = useRef(false);

  useEffect(() => {
    if (!measured || width === 0) return;
    if (!framed.current) {
      framed.current = true;
      lastKey.current = frameKey;
      anchorView(instance, orientation);
      return;
    }
    // Panning, zooming and collapsing must not re-frame: that would yank the map out
    // from under a reader who has moved somewhere deliberately.
    if (lastKey.current !== frameKey) {
      lastKey.current = frameKey;
      pending.current = true;
    }
    if (!pending.current) return;
    // A frame's grace so React Flow has measured the new node set. The request is held in a
    // ref because this effect re-runs on its own deps and its cleanup would cancel it.
    const raf = requestAnimationFrame(() => {
      pending.current = false;
      anchorView(instance, orientation, anchorId, true);
    });
    return () => cancelAnimationFrame(raf);
  }, [measured, instance, orientation, width, frameKey, anchorId]);

  return null;
}

/** Returns the map to its opening framing; panning a wide graph makes it easy to get lost. */
/**
 * Takes the slot React Flow's fit-view control used to occupy: fitting returned the same
 * framing as "Reset view", and a wide degree map wants more room, not a tighter fit.
 */
function FullscreenButton({
  fullscreen,
  onToggle,
}: {
  fullscreen: boolean;
  onToggle: () => void;
}) {
  const Icon = fullscreen ? Minimize2 : Maximize2;
  const label = fullscreen ? "Exit full screen" : "Full screen";
  return (
    <ControlButton onClick={onToggle} title={label} aria-label={label}>
      <Icon />
    </ControlButton>
  );
}

/**
 * Re-frames the map after the pane changes size: React Flow measures its container once, so
 * full screen would otherwise leave the graph pinned where it was.
 */
function RefitOnResize({ orientation, trigger }: { orientation: Orientation; trigger: unknown }) {
  const instance = useReactFlow();
  const first = React.useRef(true);

  React.useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    // Two frames: one for the layout to settle, one for React Flow to re-measure.
    const outer = requestAnimationFrame(() => {
      const inner = requestAnimationFrame(() => anchorView(instance, orientation));
      timers.current.push(inner);
    });
    const timers = { current: [outer] as number[] };
    return () => timers.current.forEach(cancelAnimationFrame);
  }, [trigger, orientation, instance]);

  return null;
}

function ResetViewButton({ orientation }: { orientation: Orientation }) {
  const instance = useReactFlow();
  return (
    <ControlButton
      onClick={() => anchorView(instance, orientation)}
      title="Reset view"
      aria-label="Reset view"
    >
      <RotateCcw />
    </ControlButton>
  );
}

export default function ProgramCanvas({
  courses,
  pools,
  onOpenPool,
  edges,
  rules,
  statuses,
  manualPassed,
  onTogglePassed,
  onSelect,
  selected = null,
  gaps = [],
  trackId = null,
  trackLabel = null,
  onChooseTrack,
  fromPath,
}: Props) {
  const router = useRouter();
  const smallScreen = React.useSyncExternalStore(
    subscribeSmallScreen,
    smallScreenSnapshot,
    wideServerSnapshot
  );
  /** Once the reader picks an orientation it holds, and the screen stops deciding. */
  const [chosenOrientation, setChosenOrientation] = useState<Orientation | null>(null);
  const orientation: Orientation =
    chosenOrientation ?? (smallScreen ? "vertical" : "horizontal");
  const [hovered, setHovered] = useState<string | null>(null);
  /**
   * Whether the last pointer was a finger: hover and right-click have no touch equivalent,
   * so on touch the first tap selects and traces and the second opens.
   */
  const touchInput = useRef(false);
  const [touchUI, setTouchUI] = useState(false);
  // `pinned` distinguishes a popover opened by hovering (which closes when the
  // pointer leaves the card) from one opened by clicking (which stays until dismissed).
  const [openHelp, setOpenHelp] = useState<{ code: string; pinned: boolean } | null>(null);
  const [collapsed, setCollapsed] = useState<Set<number>>(() => new Set());
  /** When on, a click marks a course passed instead of opening its page. */
  const [markMode, setMarkMode] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const exitRef = React.useRef<HTMLDivElement>(null);

  const openHelpFor = useCallback((code: string) => {
    setOpenHelp((current) => (current?.pinned ? current : { code, pinned: false }));
  }, []);

  const pinHelpFor = useCallback((code: string) => {
    setOpenHelp((current) =>
      current?.code === code && current.pinned ? null : { code, pinned: true }
    );
  }, []);

  const closeHelp = useCallback(() => {
    setOpenHelp((current) => (current?.pinned ? current : null));
  }, []);

  const notePointer = useCallback((event: React.PointerEvent) => {
    const touch = event.pointerType === "touch" || event.pointerType === "pen";
    touchInput.current = touch;
    setTouchUI((current) => (current === touch ? current : touch));
  }, []);

  const toggleSemester = useCallback((semester: number) => {
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(semester)) next.delete(semester);
      else next.add(semester);
      return next;
    });
  }, []);

  /**
   * Full screen is an overlay, not the Fullscreen API: the map wants most of the window, and
   * Escape should return you to the page rather than out of the browser's own mode.
   */
  React.useEffect(() => {
    if (!fullscreen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFullscreen(false);
    };
    const previousOverflow = document.body.style.overflow;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    // Move focus into the overlay so a keyboard reader is not left behind on the page
    // underneath, and hand it back on the way out.
    exitRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
  }, [fullscreen]);

  const laidOut = courses;

  const requirementLinks = useMemo(() => {
    const titleOf = new Map(courses.map((c) => [c.code, c.titleEn || c.titleSv]));
    const requires = new Map<string, RequirementLink[]>();
    const unlocks = new Map<string, RequirementLink[]>();
    for (const edge of edges) {
      const push = (map: Map<string, RequirementLink[]>, key: string, link: RequirementLink) => {
        const list = map.get(key);
        if (list) list.push(link);
        else map.set(key, [link]);
      };
      push(requires, edge.to, {
        code: edge.from,
        title: titleOf.get(edge.from) ?? edge.from,
        type: edge.type,
      });
      if (edge.type !== "EXCLUSIVE") {
        push(unlocks, edge.from, {
          code: edge.to,
          title: titleOf.get(edge.to) ?? edge.to,
          type: edge.type,
        });
      }
    }
    return { requires, unlocks };
  }, [courses, edges]);

  const choiceGroups = useMemo(
    () =>
      rules
        .filter((rule) => rule.type === "CHOOSE_ONE" || rule.type === "EITHER_OR")
        .filter((rule) => rule.courseCodes.length > 1)
        .map((rule) => ({ id: rule.id, courseCodes: rule.courseCodes })),
    [rules]
  );

  const gapSemesters = useMemo(() => new Set(gaps.map((gap) => gap.semester)), [gaps]);

  const layout = useMemo(
    () =>
      layoutProgram(
        laidOut,
        edges,
        orientation,
        new Set(pools.map((p) => p.semester)),
        choiceGroups,
        collapsed,
        gapSemesters
      ),
    [laidOut, edges, orientation, pools, choiceGroups, collapsed, gapSemesters]
  );

  /** Semesters that actually hold courses, which is what the header counts. */
  const taughtSemesters = useMemo(
    () => layout.semesters.filter((group) => !group.gap).length,
    [layout]
  );

  /** How many of the courses on screen the chosen specialisation put there. */
  const trackCourseCount = useMemo(
    () =>
      courses.filter((course) => course.trackId).length +
      pools.reduce((sum, pool) => sum + pool.courses.filter((c) => c.trackId).length, 0),
    [courses, pools]
  );

  /** The semesters a specialisation teaches on its own, so its bands can say whose they are. */
  const trackOnlySemesters = useMemo(() => {
    if (!trackLabel) return new Set<number>();
    const mixed = new Set<number>();
    const tracked = new Set<number>();
    for (const course of courses) {
      if (course.trackId) tracked.add(course.semester);
      else mixed.add(course.semester);
    }
    for (const semester of mixed) tracked.delete(semester);
    return tracked;
  }, [courses, trackLabel]);

  /**
   * The first semester the chosen specialisation adds, which is where the map should
   * land when it is chosen: the trunk it was already showing has not moved.
   */
  const revealSemester = useMemo(() => {
    if (!trackId) return null;
    const tracked = courses.filter((course) => course.trackId).map((course) => course.semester);
    return tracked.length ? Math.min(...tracked) : null;
  }, [trackId, courses]);

  // An open popover wins over the pointer: a reader moving into it is still reading about
  // its own course. Mark mode suppresses tracing, which would fight clicking through.
  const traced = markMode ? null : (openHelp?.code ?? hovered ?? selected);
  const highlight = useMemo(
    () => (traced ? computeHighlight(traced, edges) : null),
    [traced, edges]
  );

  const nodes = useMemo(() => {
    const positionOf = new Map(layout.nodes.map((n) => [n.course.code, n]));
    const result: Node[] = [];

    // Bands sit behind everything, so they are pushed first; one extent taken from the
    // deepest stack anywhere keeps every band the same size however full its semester is.
    const horizontal = orientation === "horizontal";
    // The band's labels live above the cards when time runs across, beside them when it
    // runs down; either way the map is offset by exactly the room they take.
    const rail = horizontal ? BAND_HEADER : BAND_RAIL;
    const extent =
      layout.nodes.reduce(
        (max, node) =>
          Math.max(max, horizontal ? node.y + node.height : node.x + node.width),
        0
      ) +
      rail +
      ROW_GAP;

    for (const group of layout.semesters) {
      // A gap semester keeps its place on the time axis but gets a marker, not a band.
      if (group.gap) continue;
      result.push({
        id: `band-${group.semester}`,
        type: "periodBand",
        draggable: false,
        // Decorative or self-labelling: the controls inside carry the tab stop.
        focusable: false,
        selectable: false,
        zIndex: 0,
        position: {
          x: horizontal ? group.x : group.x - rail,
          y: horizontal ? group.y - BAND_HEADER : group.y,
        },
        style: {
          width: horizontal ? group.span : extent,
          height: horizontal ? extent : group.span,
        },
        data: {
          semester: group.semester,
          credits: group.credits,
          periods: group.periods,
          orientation,
          collapsed: collapsed.has(group.semester),
          hiddenCount: group.collapsedCount,
          railWidth: rail,
          // Named where the whole semester belongs to the chosen specialisation, so
          // the years a choice unlocked read as its own rather than as more of the trunk.
          trackLabel: trackOnlySemesters.has(group.semester) ? trackLabel : null,
          onToggle: () => toggleSemester(group.semester),
        } satisfies PeriodBandData,
      });
    }

    // One marker per unbroken run of empty semesters that share a reason: three
    // missing years are one explanation, not three copies of it.
    const gapReason = new Map(gaps.map((gap) => [gap.semester, gap.reason]));
    let run: typeof layout.semesters = [];
    const flushGap = () => {
      if (run.length === 0) return;
      const first = run[0];
      const last = run[run.length - 1];
      const semesters = run.map((group) => group.semester);
      result.push({
        id: `gap-${semesters.join("-")}`,
        type: "semesterGap",
        draggable: false,
        // Decorative or self-labelling: the control inside carries the tab stop.
        focusable: false,
        selectable: false,
        zIndex: 0,
        position: {
          x: horizontal ? first.x : first.x - rail,
          y: horizontal ? first.y - BAND_HEADER : first.y,
        },
        style: {
          width: horizontal ? last.x + last.span - first.x : extent,
          height: horizontal ? extent : last.y + last.span - first.y,
        },
        data: {
          semesters,
          reason: gapReason.get(first.semester) ?? "empty",
          orientation,
          onChooseTrack,
        } satisfies SemesterGapData,
      });
      run = [];
    };
    for (const group of layout.semesters) {
      if (!group.gap) {
        flushGap();
        continue;
      }
      const reason = gapReason.get(group.semester);
      if (run.length > 0 && gapReason.get(run[0].semester) !== reason) flushGap();
      run.push(group);
    }
    flushGap();

    // Either/or sets, drawn as one outlined region around their cards.
    for (const rule of rules) {
      if (rule.type !== "CHOOSE_ONE" && rule.type !== "EITHER_OR") continue;
      const members = rule.courseCodes
        .map((code) => positionOf.get(code))
        .filter((node): node is NonNullable<typeof node> => Boolean(node));
      if (members.length < 2) continue;

      const left = Math.min(...members.map((m) => m.x));
      const top = Math.min(...members.map((m) => m.y));
      const right = Math.max(...members.map((m) => m.x + m.width));
      const bottom = Math.max(...members.map((m) => m.y + m.height));

      result.push({
        id: `choice-${rule.id}`,
        type: "choiceGroup",
        draggable: false,
        // Decorative or self-labelling: the controls inside carry the tab stop.
        focusable: false,
        selectable: false,
        zIndex: 1,
        position: { x: left - CHOICE_PADDING, y: top - CHOICE_PADDING },
        style: { pointerEvents: "none" as const },
        data: {
          label: "Choose one",
          width: right - left + CHOICE_PADDING * 2,
          height: bottom - top + CHOICE_PADDING * 2,
        } satisfies ChoiceGroupData,
      });
    }

    for (const node of layout.nodes) {
      result.push({
        // The placement id, not the course code: a code can appear more than once in
        // one view and duplicate node ids silently drop all but the first.
        id: node.id,
        type: "programCourse",
        draggable: false,
        // Cards are siblings at one z-index, so later DOM order paints over earlier.
        // A card showing its popover has to outrank the rest or the panel is covered.
        zIndex: openHelp?.code === node.course.code ? 60 : 10,
        position: { x: node.x, y: node.y },
        style: { width: node.width, height: node.height },
        // smoothstep routes from these, so they must agree with where the node
        // actually renders its handles.
        sourcePosition: orientation === "vertical" ? PositionEnum.Bottom : PositionEnum.Right,
        targetPosition: orientation === "vertical" ? PositionEnum.Top : PositionEnum.Left,
        data: {
          course: node.course,
          status: statuses?.[node.course.code] ?? null,
          periodSpan: node.periodSpan,
          dimmed: Boolean(highlight) && !highlight?.related.has(node.course.code),
          focused: highlight?.focus === node.course.code,
          selected: selected === node.course.code,
          manuallyPassed: manualPassed.has(node.course.code),
          requires: requirementLinks.requires.get(node.course.code) ?? [],
          unlocks: requirementLinks.unlocks.get(node.course.code) ?? [],
          helpOpen: openHelp?.code === node.course.code,
          onOpenHelp: openHelpFor,
          onPinHelp: pinHelpFor,
          onCloseHelp: closeHelp,
          // Named on the card only where the band above it cannot say it: a semester
          // taught wholly by one specialisation is labelled once, not thirteen times.
          trackLabel:
            node.course.trackId && !trackOnlySemesters.has(node.course.semester)
              ? trackLabel
              : null,
          markMode,
          orientation,
          onTogglePassed,
          fromPath,
        } satisfies ProgramCourseNodeData,
      });
    }

    for (const pool of pools) {
      const slot = layout.poolSlots.get(pool.semester);
      if (!slot) continue;
      result.push({
        id: `pool-${pool.semester}`,
        type: "electivePool",
        draggable: false,
        // Decorative or self-labelling: the controls inside carry the tab stop.
        focusable: false,
        zIndex: 10,
        position: { x: slot.x, y: slot.y },
        style: { width: slot.width },
        data: {
          semester: pool.semester,
          courses: pool.courses,
          onOpen: onOpenPool,
        } satisfies ElectivePoolData,
      });
    }

    return result;
  }, [
    layout,
    rules,
    statuses,
    pools,
    onOpenPool,
    highlight,
    orientation,
    collapsed,
    toggleSemester,
    selected,
    manualPassed,
    requirementLinks,
    openHelp,
    openHelpFor,
    pinHelpFor,
    closeHelp,
    markMode,
    onTogglePassed,
    gaps,
    trackLabel,
    trackOnlySemesters,
    onChooseTrack,
    fromPath,
  ]);

  const flowEdges = useMemo(() => {
    const present = new Set(layout.nodes.map((n) => n.course.code));
    return edges
      .filter((edge) => present.has(edge.from) && present.has(edge.to))
      .map((edge): Edge => {
        const key = edgeKey(edge);
        const style = EDGE_STYLE[edge.type];
        const lit = highlight?.edges.has(key) ?? false;
        const dimmed = Boolean(highlight) && !lit;
        return {
          id: key,
          source: edge.from,
          target: edge.to,
          type: "smoothstep",
          // React Flow groups edges into one container per zIndex, and any value above 0
          // lifts it above the cards, so a highlighted edge is emphasised by weight alone.
          zIndex: 0,
          // An exclusive pair is a constraint, not a direction, so it carries no arrow.
          markerEnd:
            edge.type === "EXCLUSIVE"
              ? undefined
              : { type: MarkerType.ArrowClosed, width: 12, height: 12, color: style.color },
          style: {
            stroke: style.color,
            strokeWidth: lit ? 2.25 : 1.4,
            strokeDasharray: style.dash,
            opacity: dimmed ? 0.07 : lit ? 1 : style.opacity * 0.55,
          },
        };
      });
  }, [edges, layout, highlight]);

  if (courses.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-card px-6 py-16 text-center"
      >
        <MapIcon aria-hidden className="h-5 w-5 text-muted-foreground" />
        <p className="text-[1.0625rem] font-semibold tracking-[-0.028em] text-foreground">
          No courses to show for this selection.
        </p>
        <p className="max-w-[46ch] text-[0.9375rem] leading-relaxed text-muted-foreground">
          Pick another specialisation in the sidebar, or go back to the common courses to
          see the trunk of the programme.
        </p>
      </div>
    );
  }

  return (
    <>
      {fullscreen ? (
        // Without this the page underneath shows through the inset gutter, and the
        // overlay reads as a panel floating over live content rather than a view.
        <div aria-hidden className="fixed inset-0 z-40 bg-background/85 backdrop-blur-sm" />
      ) : null}
    <div
      ref={fullscreen ? exitRef : undefined}
      tabIndex={fullscreen ? -1 : undefined}
      // In full screen the card becomes the window: fixed, inset slightly so the page
      // still frames it, and a column so the pane can take the remaining height.
      className={
        fullscreen
          ? "fixed inset-2 z-50 flex flex-col overflow-hidden rounded-lg border border-border bg-card shadow-lg sm:inset-4"
          : "rounded-lg border border-border bg-card"
      }
      role={fullscreen ? "dialog" : undefined}
      aria-modal={fullscreen ? true : undefined}
      aria-label={fullscreen ? "Course map, full screen" : undefined}
    >
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-border px-4 py-3">
        {/* The count is data and the sentence beside it is guidance, so the two are
            set apart rather than run together behind a dash. */}
        <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="font-mono text-[0.6875rem] tracking-[0.05em] text-foreground">
            {courses.length + pools.reduce((sum, pool) => sum + pool.courses.length, 0)} courses
            across {taughtSemesters} semesters
            {/* Naming the specialisation's share is what makes choosing one visibly
                do something, next to a total that otherwise just jumps. */}
            {trackLabel && trackCourseCount > 0 ? (
              <>
                <span className="mx-1.5 opacity-40">•</span>
                <span className="text-[var(--chart-2)]">
                  {trackCourseCount} from {trackLabel}
                </span>
              </>
            ) : null}
          </span>
          <span className="hidden text-xs text-muted-foreground sm:inline">
            {markMode
              ? "Clicking a course now marks it passed"
              : touchUI
                ? "Tap a course to trace it, tap again to open it"
                : "Hover or right-click a course to trace its prerequisites"}
          </span>
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {/* In the toolbar rather than floating over the canvas: anchored to its
              first semester, the map now has cards where that panel used to hover. */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setMarkMode((on) => !on)}
            aria-pressed={markMode}
            className={`gap-1.5 text-xs ${
              markMode
                ? "border-[var(--chart-4)] bg-[var(--chart-4)]/15 text-foreground hover:border-[var(--chart-4)]"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            }`}
          >
            <CheckCheck className="h-3.5 w-3.5" />
            {markMode ? "Click a course to mark it" : "Mark courses passed"}
          </Button>

          <div
            className="inline-flex items-center gap-1 rounded-md border border-border p-0.5"
            role="group"
            aria-label="Layout orientation"
          >
            {(
              [
                ["horizontal", "Horizontal", Columns3],
                ["vertical", "Vertical", Rows3],
              ] as const
            ).map(([value, label, Icon]) => (
              <Button
                key={value}
                variant="ghost"
                size="sm"
                onClick={() => setChosenOrientation(value)}
                aria-pressed={orientation === value}
                className={`h-auto gap-1.5 rounded-sm px-2.5 py-1 text-xs ${
                  orientation === value
                    ? "bg-accent text-accent-foreground hover:bg-accent"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Every course card is a tab stop, so a large programme puts a hundred or more of them
          between the toolbar and whatever follows the map. */}
      <a
        href={`#${PAST_MAP_ID}`}
        className="sr-only rounded-sm px-3 py-2 text-sm focus:not-sr-only focus:absolute focus:z-20 focus:bg-card focus:text-foreground focus:shadow-md"
      >
        Skip the course map
      </a>

      {/* The pane sits on the ambient background rather than the card surface, so cards read
          as raised in dark mode too, where a drop shadow alone carries almost nothing. */}
      <div
        className={`overflow-hidden bg-background ${fullscreen ? "min-h-0 flex-1" : "rounded-b-lg"}`}
        style={fullscreen ? undefined : { height: MAP_PANE_HEIGHT }}
        onPointerDownCapture={notePointer}
      >
        <ReactFlowProvider>
          <ReactFlow
            key={orientation}
            // React Flow ships no touch-action rule, so the browser claimed a finger drag
            // for page scrolling and d3-zoom never saw the move: the map would not pan.
            className="touch-none"
            nodes={nodes}
            edges={flowEdges}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={FIT_VIEW[orientation]}
            minZoom={0.15}
            maxZoom={1.5}
            proOptions={PRO_OPTIONS}
            nodesConnectable={false}
            // Edges are focusable by default, which puts ~300 of them ahead of the
            // first course card and makes the map unreachable by keyboard.
            edgesFocusable={false}
            nodesFocusable
            onNodeMouseEnter={(_, node) => {
              // A tap raises a synthetic mouseenter that never pairs with a leave, so
              // on touch the card would stay traced for good. Selection covers it there.
              if (touchInput.current) return;
              // Node ids identify a placement; everything downstream works in codes.
              if (node.type === "programCourse") setHovered(courseCodeOf(node));
            }}
            onNodeMouseLeave={() => setHovered(null)}
            onPaneClick={() => {
              setHovered(null);
              setOpenHelp(null);
            }}
            onNodeClick={(_, node) => {
              if (node.type !== "programCourse") return;
              const code = courseCodeOf(node);
              if (!code) return;
              if (markMode) {
                onTogglePassed(code);
                return;
              }
              // Touch has no hover or right-click, so the first tap traces the course and
              // narrows the rules, and only a second tap on the same card leaves the page.
              if (touchInput.current && selected !== code) {
                onSelect?.(code);
                return;
              }
              router.push(courseHref(code, fromPath));
            }}
            // The pointer can open a course, mark it and narrow the rules to it; the keyboard
            // could do none of those. reactflow gives focus to the node wrapper and offers no
            // per-node key handler, so the key is read here and matched back to the card that
            // holds focus. Enter matches the click, Space matches the right-click.
            onKeyDown={(event) => {
              if (event.key !== "Enter" && event.key !== " ") return;
              const node = event.target as HTMLElement;
              // Only a course card itself: the bands are focusable too, and Enter on the links
              // and buttons inside a card belongs to them.
              if (!node.classList?.contains("react-flow__node-programCourse")) return;
              const code = node.dataset.id?.split("__")[0];
              if (!code) return;
              event.preventDefault();
              if (event.key === " ") {
                onSelect?.(selected === code ? null : code);
                return;
              }
              if (markMode) onTogglePassed(code);
              else router.push(courseHref(code, fromPath));
            }}
            onNodeContextMenu={(event, node) => {
              if (node.type !== "programCourse") return;
              event.preventDefault();
              const code = courseCodeOf(node);
              if (code) onSelect?.(selected === code ? null : code);
            }}
            onPaneContextMenu={(event) => {
              event.preventDefault();
              onSelect?.(null);
            }}
          >
            <ViewAnchor
              orientation={orientation}
              frameKey={trackId ?? ""}
              anchorId={revealSemester === null ? undefined : `band-${revealSemester}`}
            />
            <Background gap={22} size={1} color="var(--border)" />
            {/* React Flow's chrome comes from an unlayered light-only stylesheet that
                outranks ordinary utilities however specific — hence the important flags. */}
            <Controls
              showInteractive={false}
              showFitView={false}
              className="overflow-hidden rounded-md border border-border shadow-sm [&_button]:!border-b [&_button]:!border-border [&_button]:!bg-card [&_button]:!fill-current [&_button]:text-muted-foreground [&_button:hover]:!bg-accent [&_button:hover]:text-foreground [&_button:last-child]:!border-b-0"
            >
              <ResetViewButton orientation={orientation} />
              <FullscreenButton
                fullscreen={fullscreen}
                onToggle={() => setFullscreen((open) => !open)}
              />
            </Controls>
            <RefitOnResize orientation={orientation} trigger={fullscreen} />
          </ReactFlow>
        </ReactFlowProvider>
      </div>
      <div id={PAST_MAP_ID} tabIndex={-1} />
    </div>
    </>
  );
}
