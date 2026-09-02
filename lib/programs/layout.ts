/**
 * Node placement for the course map: columns are fixed teaching periods, since dagre's ranking
 * would move courses out of the period they are taken in; barycentre ordering runs per column.
 */

import type { ProgramCourse, ProgramEdge } from '@/lib/programs';

export type Orientation = 'horizontal' | 'vertical';

export const NODE_WIDTH = 252;
export const NODE_HEIGHT = 130;
export const COLUMN_GAP = 20;
/** Wider than the gap between periods, so semester boundaries read as the stronger break. */
export const SEMESTER_GAP = 56;
// Edges pass between cards sharing a period; at 16px a connector barely cleared its arrowhead.
export const ROW_GAP = 32;

/**
 * A collapsed group of free electives: drawn individually, a final-semester pool makes its
 * column so tall that fitView zooms the whole map down to an unreadable sliver.
 */
export type ElectivePool = {
  semester: number;
  courses: ProgramCourse[];
};

export type PositionedCourse = {
  /**
   * Unique per placement: a code recurs across tracks and semesters, and keying by code
   * alone drops the duplicates.
   */
  id: string;
  course: ProgramCourse;
  x: number;
  y: number;
  width: number;
  height: number;
  /** Spans more than one period when the course runs across them. */
  periodSpan: number;
};

export type PeriodColumn = {
  semester: number;
  period: string;
  x: number;
  y: number;
  width: number;
};

export type SemesterGroup = {
  semester: number;
  /** Holds no courses in this view, and stands in the timeline only to mark the gap. */
  gap: boolean;
  /** Compulsory credits taken in this semester. */
  credits: number;
  /** Courses hidden because the semester is collapsed. */
  collapsedCount: number;
  x: number;
  y: number;
  /** Extent along the time axis: width when horizontal, height when vertical. */
  span: number;
  periods: string[];
};

export type ProgramLayout = {
  nodes: PositionedCourse[];
  columns: PeriodColumn[];
  semesters: SemesterGroup[];
  /** Where a semester's elective pool card sits, keyed by semester. */
  poolSlots: Map<number, { x: number; y: number; width: number }>;
};

/** Above this many optional courses in one semester, they collapse into a pool card. */
export const POOL_THRESHOLD = 8;

/**
 * Splits off semesters with enough optional electives to collapse; the rest are laid out
 * individually.
 */
export function partitionElectivePools(
  courses: ProgramCourse[],
  threshold: number = POOL_THRESHOLD
): { laidOut: ProgramCourse[]; pools: ElectivePool[] } {
  const optionalBySemester = new Map<number, ProgramCourse[]>();
  for (const course of courses) {
    if (course.compulsory || course.trackId) continue;
    const list = optionalBySemester.get(course.semester);
    if (list) list.push(course);
    else optionalBySemester.set(course.semester, [course]);
  }

  const pooled = new Set<ProgramCourse>();
  const pools: ElectivePool[] = [];
  for (const [semester, list] of optionalBySemester) {
    if (list.length < threshold) continue;
    pools.push({ semester, courses: list });
    for (const course of list) pooled.add(course);
  }

  return {
    laidOut: courses.filter((c) => !pooled.has(c)),
    pools: pools.sort((a, b) => a.semester - b.semester),
  };
}

function periodNumber(period: string): number {
  const match = /(\d+)/.exec(period);
  return match ? Number(match[1]) : 0;
}

/**
 * The (semester, period) pairs the visible courses occupy, in teaching order; a semester
 * with courses but no stated period still gets one column.
 */
function collectColumns(courses: ProgramCourse[], reservedSemesters: Set<number>) {
  const bySemester = new Map<number, Set<string>>();
  // A course whose study plan states no period still needs a column, or it is dropped.
  const needsFallback = new Set<number>();
  for (const course of courses) {
    let periods = bySemester.get(course.semester);
    if (!periods) {
      periods = new Set();
      bySemester.set(course.semester, periods);
    }
    for (const period of course.periods) periods.add(period);
    if (course.periods.length === 0) needsFallback.add(course.semester);
  }
  for (const semester of needsFallback) bySemester.get(semester)?.add('');
  // A semester holding only a pool card, or a marker for hidden courses, still needs a column.
  for (const semester of reservedSemesters) {
    if (!bySemester.has(semester)) bySemester.set(semester, new Set());
  }

  const keys: { semester: number; period: string }[] = [];
  for (const semester of [...bySemester.keys()].sort((a, b) => a - b)) {
    const periods = [...(bySemester.get(semester) as Set<string>)].sort(
      (a, b) => periodNumber(a) - periodNumber(b)
    );
    if (periods.length === 0) {
      keys.push({ semester, period: '' });
      continue;
    }
    // The unplaced-course column sorts last, after the real teaching periods.
    for (const period of periods.filter((p) => p !== '')) keys.push({ semester, period });
    if (periods.includes('')) keys.push({ semester, period: '' });
  }
  return keys;
}

/**
 * Greedy interval packing: each course takes the lowest row where every column it spans is
 * free, so a two-period course does not sit on top of its second period's occupant.
 */
function packRows(
  placements: { id: string; course: ProgramCourse; start: number; end: number; order: number }[],
  columnCount: number
): Map<string, number> {
  const occupied: boolean[][] = Array.from({ length: columnCount }, () => []);
  const rows = new Map<string, number>();

  for (const placement of [...placements].sort((a, b) => a.start - b.start || a.order - b.order)) {
    let row = 0;
    for (;;) {
      let free = true;
      for (let column = placement.start; column <= placement.end; column += 1) {
        if (occupied[column][row]) {
          free = false;
          break;
        }
      }
      if (free) break;
      row += 1;
    }
    for (let column = placement.start; column <= placement.end; column += 1) {
      occupied[column][row] = true;
    }
    rows.set(placement.id, row);
  }

  return rows;
}

/**
 * Barycentre ordering by the average row of a course's prerequisites, with unknowns last in
 * study-plan order; choice-group members share a barycentre so an either/or stays adjacent.
 */
function barycentreOrder(
  items: { id: string; course: ProgramCourse }[],
  incoming: Map<string, string[]>,
  rowOf: Map<string, number>,
  groupOf: Map<string, string>
): Map<string, number> {
  const scored = items.map(({ id, course }, index) => {
    const parents = (incoming.get(course.code) ?? [])
      .map((code) => rowOf.get(code))
      .filter((row): row is number => row !== undefined);
    return {
      id,
      index,
      group: groupOf.get(course.code) ?? null,
      barycentre: parents.length
        ? parents.reduce((a, b) => a + b, 0) / parents.length
        : Number.POSITIVE_INFINITY,
    };
  });

  // Each member adopts the group's best barycentre, so the group travels together.
  const groupScore = new Map<string, number>();
  for (const entry of scored) {
    if (!entry.group) continue;
    const best = groupScore.get(entry.group);
    if (best === undefined || entry.barycentre < best) groupScore.set(entry.group, entry.barycentre);
  }
  for (const entry of scored) {
    if (entry.group) entry.barycentre = groupScore.get(entry.group) as number;
  }

  scored.sort(
    (a, b) =>
      a.barycentre - b.barycentre ||
      (a.group ?? '').localeCompare(b.group ?? '') ||
      a.index - b.index
  );
  return new Map(scored.map((entry, order) => [entry.id, order]));
}

/** Places every visible course; `orientation` decides which axis time advances along. */
export function layoutProgram(
  courses: ProgramCourse[],
  edges: ProgramEdge[],
  orientation: Orientation = 'horizontal',
  pooledSemesters: Set<number> = new Set(),
  choiceGroups: { id: string; courseCodes: string[] }[] = [],
  collapsedSemesters: Set<number> = new Set(),
  gapSemesters: Set<number> = new Set()
): ProgramLayout {
  // A collapsed semester keeps its band, and so its column, but contributes no cards.
  const allCourses = courses;
  const visibleCourses = collapsedSemesters.size
    ? courses.filter((course) => !collapsedSemesters.has(course.semester))
    : courses;

  const groupOf = new Map<string, string>();
  for (const group of choiceGroups) {
    for (const code of group.courseCodes) {
      if (!groupOf.has(code)) groupOf.set(code, group.id);
    }
  }

  const columnKeys = collectColumns(
    visibleCourses,
    new Set([...pooledSemesters, ...collapsedSemesters, ...gapSemesters])
  );
  const indexOf = new Map(columnKeys.map((key, index) => [`${key.semester}|${key.period}`, index]));

  const horizontal = orientation === 'horizontal';
  // Time runs along the card's width when horizontal and its height when vertical.
  const timeStep = horizontal ? NODE_WIDTH : NODE_HEIGHT;
  const crossStep = (horizontal ? NODE_HEIGHT : NODE_WIDTH) + ROW_GAP;

  // Semester boundaries are a wider gap than period boundaries.
  const offsets: number[] = [];
  let cursor = 0;
  columnKeys.forEach((key, index) => {
    if (index > 0) {
      cursor +=
        timeStep + (columnKeys[index - 1].semester === key.semester ? COLUMN_GAP : SEMESTER_GAP);
    }
    offsets.push(cursor);
  });

  const incoming = new Map<string, string[]>();
  for (const edge of edges) {
    if (edge.type === 'EXCLUSIVE') continue;
    const list = incoming.get(edge.to);
    if (list) list.push(edge.from);
    else incoming.set(edge.to, [edge.from]);
  }

  /**
   * One placement per contiguous run of columns: a course taught across a semester boundary
   * is one card spanning both, while one offered again years later is two separate cards.
   */
  type Placement = {
    id: string;
    course: ProgramCourse;
    start: number;
    end: number;
    order: number;
  };

  const byCode = new Map<string, ProgramCourse[]>();
  for (const course of visibleCourses) {
    const list = byCode.get(course.code);
    if (list) list.push(course);
    else byCode.set(course.code, [course]);
  }

  const placements: Placement[] = [];
  for (const [code, entries] of byCode) {
    // A profile inherits its specialisation's courses, listing one twice; keep one per column.
    const columnOwner = new Map<number, ProgramCourse>();
    for (const course of entries) {
      for (const period of course.periods.length ? course.periods : ['']) {
        const column = indexOf.get(`${course.semester}|${period}`);
        if (column !== undefined && !columnOwner.has(column)) columnOwner.set(column, course);
      }
    }
    if (columnOwner.size === 0) continue;

    const columns = [...columnOwner.keys()].sort((a, b) => a - b);
    let runStart = columns[0];
    let previous = columns[0];
    let runIndex = 0;

    const pushRun = (start: number, end: number) => {
      placements.push({
        // The first run keeps the bare code so code-to-code edges land on the earliest run.
        id: runIndex === 0 ? code : `${code}__${(columnOwner.get(start) as ProgramCourse).semester}`,
        course: columnOwner.get(start) as ProgramCourse,
        start,
        end,
        order: 0,
      });
      runIndex += 1;
    };

    for (const column of columns.slice(1)) {
      if (column === previous + 1) {
        previous = column;
        continue;
      }
      pushRun(runStart, previous);
      runStart = column;
      previous = column;
    }
    pushRun(runStart, previous);
  }

  // Order column by column so each one can see where its prerequisites landed.
  const rowOf = new Map<string, number>();
  const byStart = new Map<number, typeof placements>();
  for (const placement of placements) {
    const list = byStart.get(placement.start);
    if (list) list.push(placement);
    else byStart.set(placement.start, [placement]);
  }
  for (const start of [...byStart.keys()].sort((a, b) => a - b)) {
    const group = byStart.get(start) as typeof placements;
    const order = barycentreOrder(group, incoming, rowOf, groupOf);
    for (const placement of group) {
      placement.order = order.get(placement.id) ?? 0;
    }
    // Provisional rows, refined by packRows; keyed by code because edges are code-to-code.
    group.forEach((placement) => rowOf.set(placement.course.code, placement.order));
  }

  const rows = packRows(placements, columnKeys.length);

  const nodes: PositionedCourse[] = placements.map((placement) => {
    const span = placement.end - placement.start + 1;
    const major = offsets[placement.start];
    const along = offsets[placement.end] + timeStep - offsets[placement.start];
    const minor = (rows.get(placement.id) ?? 0) * crossStep;
    return {
      id: placement.id,
      course: placement.course,
      x: horizontal ? major : minor,
      y: horizontal ? minor : major,
      width: horizontal ? along : NODE_WIDTH,
      height: horizontal ? NODE_HEIGHT : along,
      periodSpan: span,
    };
  });

  const columns: PeriodColumn[] = columnKeys.map((key, index) => ({
    semester: key.semester,
    period: key.period,
    x: horizontal ? offsets[index] : 0,
    y: horizontal ? 0 : offsets[index],
    width: timeStep,
  }));

  const semesters: SemesterGroup[] = [];
  for (const key of columnKeys) {
    const index = indexOf.get(`${key.semester}|${key.period}`) as number;
    const existing = semesters.find((group) => group.semester === key.semester);
    const end = offsets[index] + timeStep;
    if (existing) {
      existing.span = end - (horizontal ? existing.x : existing.y);
      if (key.period) existing.periods.push(key.period);
    } else {
      semesters.push({
        semester: key.semester,
        gap: gapSemesters.has(key.semester),
        credits: 0,
        collapsedCount: 0,
        x: horizontal ? offsets[index] : 0,
        y: horizontal ? 0 : offsets[index],
        span: timeStep,
        periods: key.period ? [key.period] : [],
      });
    }
  }
  for (const group of semesters) {
    // Every course counts, so a collapsed band still reports the load it hides.
    const inSemester = allCourses.filter((c) => c.semester === group.semester);
    const compulsory = inSemester.filter((c) => c.compulsory);
    // A programme that marks nothing compulsory would otherwise report "0 hp" for a full semester.
    const counted = compulsory.length > 0 ? compulsory : inSemester;
    group.credits = counted.reduce((sum, c) => sum + (c.creditsInSemester ?? 0), 0);
    group.collapsedCount = collapsedSemesters.has(group.semester) ? inSemester.length : 0;
  }

  // The pool card hangs below the last individually placed course of its semester.
  const poolSlots = new Map<number, { x: number; y: number; width: number }>();
  for (const semester of pooledSemesters) {
    const group = semesters.find((s) => s.semester === semester);
    if (!group) continue;
    const inSemester = nodes.filter((n) => n.course.semester === semester);
    const nextRow = inSemester.length
      ? Math.max(...inSemester.map((n) => (horizontal ? n.y : n.x))) + crossStep
      : 0;
    poolSlots.set(semester, {
      x: horizontal ? group.x : nextRow,
      y: horizontal ? nextRow : group.y,
      width: NODE_WIDTH,
    });
  }

  return { nodes, columns, semesters, poolSlots };
}
