import {
  NODE_HEIGHT,
  NODE_WIDTH,
  ROW_GAP,
  SEMESTER_GAP,
  COLUMN_GAP,
  layoutProgram,
  partitionElectivePools,
} from '@/lib/programs/layout';
import type { ProgramCourse, ProgramEdge } from '@/lib/programs';
import { getProgram, listPrograms, programSlug } from '@/lib/programs';

function course(
  code: string,
  semester: number,
  periods: string[] = ['Period 1'],
  extra: Partial<ProgramCourse> = {}
): ProgramCourse {
  return {
    code,
    titleEn: code,
    titleSv: code,
    credits: 5,
    creditsInPeriod: null,
    creditsInSemester: 5,
    compulsory: true,
    category: 'MANDATORY_CORE',
    mainFieldEn: null,
    depthCode: null,
    semester,
    periods,
    trackId: null,
    onlyProgramme: null,
    ...extra,
  };
}

const edge = (from: string, to: string): ProgramEdge => ({ from, to, type: 'HARD', source: 'llm' });

const nodeFor = (layout: ReturnType<typeof layoutProgram>, code: string) =>
  layout.nodes.find((n) => n.course.code === code);

describe('layoutProgram columns', () => {
  it('makes one column per period a course actually occupies', () => {
    const layout = layoutProgram(
      [course('A', 1, ['Period 1']), course('B', 1, ['Period 2'])],
      [],
      'horizontal'
    );
    expect(layout.columns.map((c) => c.period)).toEqual(['Period 1', 'Period 2']);
  });

  it('orders periods by number, not by discovery order', () => {
    const layout = layoutProgram(
      [course('B', 1, ['Period 2']), course('A', 1, ['Period 1'])],
      [],
      'horizontal'
    );
    expect(layout.columns.map((c) => c.period)).toEqual(['Period 1', 'Period 2']);
  });

  it('separates semesters by a wider gap than periods', () => {
    const layout = layoutProgram(
      [course('A', 1, ['Period 1']), course('B', 1, ['Period 2']), course('C', 2, ['Period 3'])],
      [],
      'horizontal'
    );
    const [p1, p2, p3] = layout.columns.map((c) => c.x);
    expect(p2 - p1).toBe(NODE_WIDTH + COLUMN_GAP);
    expect(p3 - p2).toBe(NODE_WIDTH + SEMESTER_GAP);
  });

  it('groups a semester over its periods', () => {
    const layout = layoutProgram(
      [course('A', 1, ['Period 1']), course('B', 1, ['Period 2'])],
      [],
      'horizontal'
    );
    expect(layout.semesters).toHaveLength(1);
    expect(layout.semesters[0].periods).toEqual(['Period 1', 'Period 2']);
    expect(layout.semesters[0].span).toBe(NODE_WIDTH * 2 + COLUMN_GAP);
  });

  it('sums only compulsory per-semester credits into the band', () => {
    const layout = layoutProgram(
      [
        course('A', 1),
        course('B', 1, ['Period 1'], { compulsory: false, creditsInSemester: 100 }),
      ],
      [],
      'horizontal'
    );
    expect(layout.semesters[0].credits).toBe(5);
  });
});

describe('layoutProgram placement', () => {
  it('spans a course across the periods it runs in', () => {
    const layout = layoutProgram([course('A', 1, ['Period 1', 'Period 2'])], [], 'horizontal');
    const node = nodeFor(layout, 'A');
    expect(node?.periodSpan).toBe(2);
    expect(node?.width).toBe(NODE_WIDTH * 2 + COLUMN_GAP);
    expect(node?.height).toBe(NODE_HEIGHT);
  });

  it('gives a single-period course a single-column width', () => {
    const layout = layoutProgram([course('A', 1, ['Period 1'])], [], 'horizontal');
    expect(nodeFor(layout, 'A')?.width).toBe(NODE_WIDTH);
  });

  it('never lets a spanning course overlap what sits in its second period', () => {
    // A runs across both periods; B is confined to period 2 and must move down.
    const layout = layoutProgram(
      [course('A', 1, ['Period 1', 'Period 2']), course('B', 1, ['Period 2'])],
      [],
      'horizontal'
    );
    expect(nodeFor(layout, 'A')?.y).toBe(0);
    expect(nodeFor(layout, 'B')?.y).toBe(NODE_HEIGHT + ROW_GAP);
  });

  it('stacks courses sharing a period', () => {
    const layout = layoutProgram(
      [course('A', 1, ['Period 1']), course('B', 1, ['Period 1'])],
      [],
      'horizontal'
    );
    const ys = layout.nodes.map((n) => n.y).sort((a, b) => a - b);
    expect(ys).toEqual([0, NODE_HEIGHT + ROW_GAP]);
  });

  it('keeps a course in the period it is taught in', () => {
    const layout = layoutProgram(
      [course('A', 1, ['Period 1']), course('B', 2, ['Period 3'])],
      [edge('A', 'B')],
      'horizontal'
    );
    expect(nodeFor(layout, 'B')?.x).toBeGreaterThan(nodeFor(layout, 'A')?.x as number);
  });

  it('swaps the axis when vertical', () => {
    const layout = layoutProgram(
      [course('A', 1, ['Period 1']), course('B', 2, ['Period 3'])],
      [],
      'vertical'
    );
    expect(nodeFor(layout, 'A')?.x).toBe(0);
    // Time advances by the card's height when the map runs vertically.
    expect(nodeFor(layout, 'B')?.y).toBe(NODE_HEIGHT + SEMESTER_GAP);
  });

  it('steps rows by the card width when vertical, so cards cannot overlap', () => {
    const layout = layoutProgram(
      [course('A', 1, ['Period 1']), course('B', 1, ['Period 1'])],
      [],
      'vertical'
    );
    const xs = layout.nodes.map((n) => n.x).sort((a, b) => a - b);
    expect(xs).toEqual([0, NODE_WIDTH + ROW_GAP]);
  });

  it('grows a multi-period course along the time axis in either orientation', () => {
    const spanning = [course('A', 1, ['Period 1', 'Period 2'])];
    const h = nodeFor(layoutProgram(spanning, [], 'horizontal'), 'A');
    expect(h?.width).toBe(NODE_WIDTH * 2 + COLUMN_GAP);
    expect(h?.height).toBe(NODE_HEIGHT);

    const v = nodeFor(layoutProgram(spanning, [], 'vertical'), 'A');
    expect(v?.height).toBe(NODE_HEIGHT * 2 + COLUMN_GAP);
    expect(v?.width).toBe(NODE_WIDTH);
  });

  it('orders a column to follow its prerequisites', () => {
    const courses = [
      course('P1', 1, ['Period 1']),
      course('P2', 1, ['Period 1']),
      course('C2', 1, ['Period 2']),
      course('C1', 1, ['Period 2']),
    ];
    const layout = layoutProgram(courses, [edge('P1', 'C1'), edge('P2', 'C2')], 'horizontal');
    expect(nodeFor(layout, 'C1')?.y).toBeLessThan(nodeFor(layout, 'C2')?.y as number);
  });

  it('drops a course whose period has no column', () => {
    const layout = layoutProgram([course('A', 1, [])], [], 'horizontal');
    // A course with no stated period still gets the semester's fallback column.
    expect(layout.nodes).toHaveLength(1);
  });
});

describe('layoutProgram pools', () => {
  it('reserves a slot below the placed courses', () => {
    const layout = layoutProgram(
      [course('A', 10, ['Period 1'])],
      [],
      'horizontal',
      new Set([10])
    );
    const slot = layout.poolSlots.get(10);
    expect(slot?.y).toBe(NODE_HEIGHT + ROW_GAP);
  });

  it('gives a semester that is only a pool its own column', () => {
    const layout = layoutProgram([course('A', 1)], [], 'horizontal', new Set([10]));
    expect(layout.semesters.map((s) => s.semester)).toEqual([1, 10]);
    expect(layout.poolSlots.get(10)?.y).toBe(0);
  });
});

describe('partitionElectivePools', () => {
  it('collapses a large pool of optional trunk courses', () => {
    const optional = Array.from({ length: 10 }, (_, i) =>
      course(`E${i}`, 10, ['Period 1'], { compulsory: false })
    );
    const { laidOut, pools } = partitionElectivePools([course('T', 10), ...optional]);
    expect(laidOut.map((c) => c.code)).toEqual(['T']);
    expect(pools).toHaveLength(1);
    expect(pools[0].courses).toHaveLength(10);
  });

  it('leaves a small group laid out individually', () => {
    const optional = Array.from({ length: 3 }, (_, i) =>
      course(`E${i}`, 10, ['Period 1'], { compulsory: false })
    );
    const { pools, laidOut } = partitionElectivePools(optional);
    expect(pools).toHaveLength(0);
    expect(laidOut).toHaveLength(3);
  });

  it('never pools a compulsory or track course', () => {
    const many = Array.from({ length: 12 }, (_, i) =>
      course(`C${i}`, 7, ['Period 1'], { compulsory: false, trackId: 'some-track' })
    );
    expect(partitionElectivePools(many).pools).toHaveLength(0);
  });

  it('pools each semester independently', () => {
    const build = (semester: number) =>
      Array.from({ length: 9 }, (_, i) =>
        course(`S${semester}E${i}`, semester, ['Period 1'], { compulsory: false })
      );
    const { pools } = partitionElectivePools([...build(9), ...build(10)]);
    expect(pools.map((p) => p.semester)).toEqual([9, 10]);
  });
});

describe('layoutProgram choice groups', () => {
  it('places the options of a choice next to each other', () => {
    // Without grouping, C would sort between the two options because it has a
    // prerequisite and they do not.
    const courses = [
      course('P', 1, ['Period 1']),
      course('OPT_A', 1, ['Period 2']),
      course('C', 1, ['Period 2']),
      course('OPT_B', 1, ['Period 2']),
    ];
    const layout = layoutProgram(
      courses,
      [edge('P', 'C')],
      'horizontal',
      new Set(),
      [{ id: 'rule-1', courseCodes: ['OPT_A', 'OPT_B'] }]
    );
    const rowOf = (code: string) =>
      (layout.nodes.find((n) => n.course.code === code)?.y ?? 0) / (NODE_HEIGHT + ROW_GAP);
    expect(Math.abs(rowOf('OPT_A') - rowOf('OPT_B'))).toBe(1);
  });

  it('leaves ordering untouched when there are no groups', () => {
    const courses = [course('A', 1, ['Period 1']), course('B', 1, ['Period 1'])];
    const withGroups = layoutProgram(courses, [], 'horizontal', new Set(), []);
    const plain = layoutProgram(courses, [], 'horizontal');
    expect(withGroups.nodes.map((n) => n.y)).toEqual(plain.nodes.map((n) => n.y));
  });

  it('ignores a group whose courses are not on screen', () => {
    const layout = layoutProgram(
      [course('A', 1, ['Period 1'])],
      [],
      'horizontal',
      new Set(),
      [{ id: 'rule-1', courseCodes: ['GONE_1', 'GONE_2'] }]
    );
    expect(layout.nodes).toHaveLength(1);
  });
});

describe('layoutProgram collapsed semesters', () => {
  const courses = [
    course('A', 1, ['Period 1']),
    course('B', 1, ['Period 2']),
    course('C', 2, ['Period 3']),
  ];

  it('places no cards for a collapsed semester', () => {
    const layout = layoutProgram(courses, [], 'horizontal', new Set(), [], new Set([1]));
    expect(layout.nodes.map((n) => n.course.code)).toEqual(['C']);
  });

  it('keeps the band so the semester can be brought back', () => {
    const layout = layoutProgram(courses, [], 'horizontal', new Set(), [], new Set([1]));
    expect(layout.semesters.map((s) => s.semester)).toEqual([1, 2]);
  });

  it('reports how many courses it is hiding', () => {
    const layout = layoutProgram(courses, [], 'horizontal', new Set(), [], new Set([1]));
    expect(layout.semesters[0].collapsedCount).toBe(2);
    expect(layout.semesters[1].collapsedCount).toBe(0);
  });

  it('still reports the credits it is hiding', () => {
    const layout = layoutProgram(courses, [], 'horizontal', new Set(), [], new Set([1]));
    expect(layout.semesters[0].credits).toBe(10);
  });

  it('collapses a semester to a single column', () => {
    const expanded = layoutProgram(courses, [], 'horizontal');
    const collapsed = layoutProgram(courses, [], 'horizontal', new Set(), [], new Set([1]));
    expect(collapsed.semesters[0].span).toBeLessThan(expanded.semesters[0].span);
  });

  it('closes the gap the collapsed semester leaves behind', () => {
    const expanded = layoutProgram(courses, [], 'horizontal');
    const collapsed = layoutProgram(courses, [], 'horizontal', new Set(), [], new Set([1]));
    expect(collapsed.semesters[1].x).toBeLessThan(expanded.semesters[1].x);
  });

  it('behaves normally when nothing is collapsed', () => {
    const plain = layoutProgram(courses, [], 'horizontal');
    const empty = layoutProgram(courses, [], 'horizontal', new Set(), [], new Set());
    expect(empty.nodes).toHaveLength(plain.nodes.length);
  });
});

describe('layoutProgram placement identity', () => {
  it('gives every placement a unique id', () => {
    // A profile inherits its specialisation's courses, so the same code arrives twice.
    const shared = [
      course('1RT495', 7, ['Period 1'], { trackId: 'inbyggda-system' }),
      course('1RT495', 7, ['Period 1'], { trackId: 'inbyggda-system__systemteknik' }),
    ];
    const layout = layoutProgram(shared, [], 'horizontal');
    const ids = layout.nodes.map((n) => n.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('draws a duplicated course once when both rows are the same column', () => {
    const shared = [
      course('1RT495', 7, ['Period 1'], { trackId: 'inbyggda-system' }),
      course('1RT495', 7, ['Period 1'], { trackId: 'inbyggda-system__systemteknik' }),
    ];
    expect(layoutProgram(shared, [], 'horizontal').nodes).toHaveLength(1);
  });

  it('spans a course taught across a semester boundary as one card', () => {
    // 1DL201 runs period 2 of semester 1 into period 3 of semester 2.
    const spanning = [
      course('1DL201', 1, ['Period 2'], { credits: 20, creditsInSemester: 10 }),
      course('1DL201', 2, ['Period 3'], { credits: 20, creditsInSemester: 10 }),
      course('OTHER', 1, ['Period 1']),
    ];
    const layout = layoutProgram(spanning, [], 'horizontal');
    const node = layout.nodes.find((n) => n.course.code === '1DL201');
    expect(layout.nodes.filter((n) => n.course.code === '1DL201')).toHaveLength(1);
    expect(node?.periodSpan).toBe(2);
    expect(node?.width).toBeGreaterThan(NODE_WIDTH);
  });

  it('keeps a course offered in separate semesters as separate cards', () => {
    // Offered in semester 1 and again in semester 3 is two opportunities, not one
    // course running for three semesters.
    const offered = [
      course('1MA017', 1, ['Period 1']),
      course('1MA017', 3, ['Period 1']),
      course('FILL', 2, ['Period 3']),
    ];
    const layout = layoutProgram(offered, [], 'horizontal');
    const nodes = layout.nodes.filter((n) => n.course.code === '1MA017');
    expect(nodes).toHaveLength(2);
    expect(new Set(nodes.map((n) => n.id)).size).toBe(2);
    expect(nodes.every((n) => n.periodSpan === 1)).toBe(true);
  });

  it('keeps the bare code on the earliest placement so edges still resolve', () => {
    const offered = [
      course('1MA017', 1, ['Period 1']),
      course('1MA017', 3, ['Period 1']),
      course('FILL', 2, ['Period 3']),
    ];
    const layout = layoutProgram(offered, [], 'horizontal');
    const first = layout.nodes.find((n) => n.id === '1MA017');
    expect(first?.course.semester).toBe(1);
  });
});

describe('layoutProgram completeness', () => {
  it('places a course whose study plan states no period', () => {
    // TVP2N lists two project courses with no period; they were being dropped.
    const courses = [
      course('1GV147', 1, ['Period 1'], { compulsory: false }),
      course('1GV144', 1, [], { compulsory: false }),
    ];
    const layout = layoutProgram(courses, [], 'horizontal');
    expect(layout.nodes.map((n) => n.course.code).sort()).toEqual(['1GV144', '1GV147']);
  });

  it('sorts the unplaced-course column after the real periods', () => {
    const courses = [
      course('A', 1, ['Period 1']),
      course('B', 1, ['Period 2']),
      course('C', 1, []),
    ];
    const layout = layoutProgram(courses, [], 'horizontal');
    const x = (code: string) => layout.nodes.find((n) => n.course.code === code)?.x ?? -1;
    expect(x('C')).toBeGreaterThan(x('B'));
  });

  it('reports credits on offer when a semester marks nothing compulsory', () => {
    // Several master's programmes have no compulsory courses at all; "0 hp" over a
    // semester of 30 hp courses is worse than reporting what is offered.
    const courses = [
      course('X', 1, ['Period 1'], { compulsory: false, creditsInSemester: 15 }),
      course('Y', 1, ['Period 2'], { compulsory: false, creditsInSemester: 15 }),
    ];
    expect(layoutProgram(courses, [], 'horizontal').semesters[0].credits).toBe(30);
  });

  it('still counts only compulsory credits where a semester has them', () => {
    const courses = [
      course('REQ', 1, ['Period 1'], { creditsInSemester: 10 }),
      course('OPT', 1, ['Period 2'], { compulsory: false, creditsInSemester: 100 }),
    ];
    expect(layoutProgram(courses, [], 'horizontal').semesters[0].credits).toBe(10);
  });
});

describe('layoutProgram missing semesters', () => {
  const courses = [course('A', 1, ['Period 1']), course('B', 4, ['Period 1'])];

  it('keeps an empty semester on the time axis so the gap can be marked', () => {
    const layout = layoutProgram(
      courses,
      [],
      'horizontal',
      new Set(),
      [],
      new Set(),
      new Set([2, 3])
    );
    expect(layout.semesters.map((s) => s.semester)).toEqual([1, 2, 3, 4]);
    expect(layout.semesters.filter((s) => s.gap).map((s) => s.semester)).toEqual([2, 3]);
  });

  it('places the gap between the semesters it separates, in order', () => {
    const layout = layoutProgram(
      courses,
      [],
      'horizontal',
      new Set(),
      [],
      new Set(),
      new Set([2, 3])
    );
    const x = (semester: number) =>
      layout.semesters.find((s) => s.semester === semester)?.x ?? -1;
    expect(x(1)).toBeLessThan(x(2));
    expect(x(2)).toBeLessThan(x(3));
    expect(x(3)).toBeLessThan(x(4));
  });

  it('leaves the courses themselves untouched', () => {
    const withGap = layoutProgram(
      courses,
      [],
      'horizontal',
      new Set(),
      [],
      new Set(),
      new Set([2, 3])
    );
    // Semester 4 is pushed along by the space the gap now occupies, but nothing is
    // added to or dropped from the map itself.
    expect(withGap.nodes.map((n) => n.course.code).sort()).toEqual(['A', 'B']);
    expect(withGap.semesters.filter((s) => !s.gap)).toHaveLength(2);
  });

  it('marks no gap when none is asked for', () => {
    const layout = layoutProgram(courses, [], 'horizontal');
    expect(layout.semesters.every((s) => s.gap === false)).toBe(true);
  });
});

describe('layoutProgram over the published programmes', () => {
  // The crash this guards against was found by a reader, not by a test: a course
  // taught in two semesters, or inherited by a profile from its specialisation,
  // produced two placements under one key and React dropped one of them. The unit
  // cases above cover the rule; this covers the 77 plans it actually has to hold.
  const programmes = listPrograms();

  it('has programmes to lay out', () => {
    expect(programmes.length).toBeGreaterThan(0);
  });

  it.each(programmes.map((entry) => [entry.code, entry] as const))(
    'gives %s a unique id per placement in both orientations',
    (_code, entry) => {
      const program = getProgram(programSlug(entry));
      expect(program).not.toBeNull();
      const courses = program!.courses;
      const edges = program!.edges;

      for (const orientation of ['horizontal', 'vertical'] as const) {
        const { nodes } = layoutProgram(courses, edges, orientation);
        const ids = nodes.map((node) => node.id);
        expect(new Set(ids).size).toBe(ids.length);
      }
    }
  );
});
