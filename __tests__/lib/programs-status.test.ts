import { deriveStatuses, matchTranscript, summarise } from '@/lib/programs/status';
import type { ProgramCourse, ProgramEdge } from '@/lib/programs';

function course(code: string, extra: Partial<ProgramCourse> = {}): ProgramCourse {
  return {
    code,
    titleEn: `Course ${code}`,
    titleSv: `Kurs ${code}`,
    credits: 5,
    creditsInPeriod: null,
    creditsInSemester: 5,
    compulsory: true,
    category: 'MANDATORY_CORE',
    mainFieldEn: null,
    depthCode: null,
    semester: 1,
    periods: [],
    trackId: null,
    ...extra,
  };
}

const hard = (from: string, to: string): ProgramEdge => ({ from, to, type: 'HARD', source: 'llm' });

describe('matchTranscript', () => {
  const courses = [
    course('1MA090', { titleEn: 'Algebra and Geometry', titleSv: 'Algebra och geometri' }),
    course('1FA535', { titleEn: 'Quantum Physics', titleSv: 'Kvantfysik F' }),
  ];

  it('treats every transcript entry as passed', () => {
    // A course only reaches the "Completed courses" table once it has been passed,
    // so no grade needs storing to know it.
    const { passed } = matchTranscript(courses, [{ rawCourseCode: '1MA090' }]);
    expect(passed.has('1MA090')).toBe(true);
  });

  it('credits nothing when two courses share a title', () => {
    // A programme can run a 5 hp and a 10 hp "Project work"; a row with no code cannot say
    // which was passed, and guessing hands the student the wrong one.
    const ambiguous = [
      course('1DT081', { titleEn: 'Project Work in IT', titleSv: 'Projektarbete i IT' }),
      course('1DT088', { titleEn: 'Project Work in IT', titleSv: 'Projektarbete i IT', credits: 10 }),
    ];
    const { passed } = matchTranscript(ambiguous, [{ rawCourseName: 'Project Work in IT' }]);
    expect(passed.size).toBe(0);

    // The code still resolves it outright.
    const byCode = matchTranscript(ambiguous, [{ rawCourseCode: '1DT088' }]);
    expect(byCode.passed).toEqual(new Set(['1DT088']));
  });

  it('matches case-insensitively on code', () => {
    const { passed } = matchTranscript(courses, [{ rawCourseCode: '1ma090' }]);
    expect(passed.has('1MA090')).toBe(true);
  });

  it('falls back to the Swedish title when no code is present', () => {
    const { passed } = matchTranscript(courses, [{ rawCourseName: 'Algebra och geometri' }]);
    expect(passed.has('1MA090')).toBe(true);
  });

  it('ignores diacritics and punctuation when matching titles', () => {
    const { passed } = matchTranscript(courses, [{ rawCourseName: 'kvantfysik  f' }]);
    expect(passed.has('1FA535')).toBe(true);
  });

  it('marks a currently running registration as in progress', () => {
    const { passed, registered } = matchTranscript(
      courses,
      [],
      [{ code: '1FA535', title: 'Quantum Physics', current: true }]
    );
    expect(passed.size).toBe(0);
    expect(registered.has('1FA535')).toBe(true);
  });

  it('ignores a registration that has already ended', () => {
    // Having been registered proves attendance, never a pass.
    const { passed, registered } = matchTranscript(
      courses,
      [],
      [{ code: '1FA535', title: 'Quantum Physics', current: false }]
    );
    expect(passed.size).toBe(0);
    expect(registered.size).toBe(0);
  });

  it('prefers a completion over a concurrent re-registration', () => {
    const { passed, registered } = matchTranscript(
      courses,
      [{ rawCourseCode: '1MA090' }],
      [{ code: '1MA090', current: true }]
    );
    expect(passed.has('1MA090')).toBe(true);
    expect(registered.has('1MA090')).toBe(false);
  });

  it('ignores rows outside the programme', () => {
    const { passed } = matchTranscript(courses, [{ rawCourseCode: '9ZZ999' }]);
    expect(passed.size).toBe(0);
  });
});

describe('deriveStatuses', () => {
  const courses = [course('A'), course('B'), course('C')];
  const edges = [hard('A', 'B'), hard('B', 'C')];

  it('marks passed courses completed', () => {
    const statuses = deriveStatuses(courses, edges, new Set(['A']), new Set());
    expect(statuses.A).toBe('COMPLETED');
  });

  it('marks registered courses in progress', () => {
    const statuses = deriveStatuses(courses, edges, new Set(), new Set(['A']));
    expect(statuses.A).toBe('IN_PROGRESS');
  });

  it('marks a course upcoming once its prerequisites are met', () => {
    const statuses = deriveStatuses(courses, edges, new Set(['A']), new Set());
    expect(statuses.B).toBe('UPCOMING');
  });

  it('keeps a course with unmet prerequisites not started', () => {
    // C needs B, which has not been passed.
    const statuses = deriveStatuses(courses, edges, new Set(['A']), new Set());
    expect(statuses.C).toBe('NOT_STARTED');
  });

  it('treats a course with no prerequisites as immediately upcoming', () => {
    const statuses = deriveStatuses(courses, edges, new Set(), new Set());
    expect(statuses.A).toBe('UPCOMING');
  });

  it('requires every prerequisite, not just one', () => {
    const list = [course('X'), course('Y'), course('Z')];
    const statuses = deriveStatuses(list, [hard('X', 'Z'), hard('Y', 'Z')], new Set(['X']), new Set());
    expect(statuses.Z).toBe('NOT_STARTED');
  });

  it('does not let soft or exclusive edges gate a course', () => {
    const soft: ProgramEdge[] = [
      { from: 'A', to: 'B', type: 'SOFT', source: 'llm' },
      { from: 'A', to: 'C', type: 'EXCLUSIVE', source: 'llm' },
    ];
    const statuses = deriveStatuses(courses, soft, new Set(), new Set());
    expect(statuses.B).toBe('UPCOMING');
    expect(statuses.C).toBe('UPCOMING');
  });
});

describe('summarise', () => {
  it('counts each status', () => {
    const courses = [course('A'), course('B'), course('C'), course('D')];
    const result = summarise(courses, {
      A: 'COMPLETED',
      B: 'IN_PROGRESS',
      C: 'UPCOMING',
      D: 'NOT_STARTED',
    });
    expect(result.counts).toEqual({
      COMPLETED: 1,
      IN_PROGRESS: 1,
      UPCOMING: 1,
      NOT_STARTED: 1,
    });
  });

  it('measures percentage against compulsory credits only', () => {
    // The optional elective must not dilute the figure.
    const courses = [
      course('A', { credits: 10, creditsInSemester: 10 }),
      course('B', { credits: 10, creditsInSemester: 10 }),
      course('E', { credits: 200, creditsInSemester: 200, compulsory: false }),
    ];
    const result = summarise(courses, { A: 'COMPLETED', B: 'NOT_STARTED', E: 'NOT_STARTED' });
    expect(result.creditsRequired).toBe(20);
    expect(result.creditsCompleted).toBe(10);
    expect(result.percentComplete).toBe(50);
  });

  it('counts a cross-semester course only once, by its per-semester share', () => {
    // The same 10 hp course appears in two semesters at 5 hp each.
    const courses = [
      course('1FA105', { credits: 10, creditsInSemester: 5, semester: 1 }),
      course('1FA105', { credits: 10, creditsInSemester: 5, semester: 2 }),
    ];
    expect(summarise(courses, { '1FA105': 'COMPLETED' }).creditsRequired).toBe(10);
  });

  it('counts a course offered in either of two semesters once, not twice', () => {
    // 1MA017 is listed in semesters 4 and 6 of tdv1k at its full 5 credits in each: the study
    // plan is offering a choice of when to take it, not asking for it twice.
    const courses = [
      course('1MA017', { credits: 5, creditsInSemester: 5, semester: 4 }),
      course('1MA017', { credits: 5, creditsInSemester: 5, semester: 6 }),
    ];
    const result = summarise(courses, { '1MA017': 'COMPLETED' });
    expect(result.creditsRequired).toBe(5);
    expect(result.creditsCompleted).toBe(5);
    expect(result.counts.COMPLETED).toBe(1);
  });

  it('reports zero rather than dividing by zero when nothing is compulsory', () => {
    const result = summarise([course('A', { compulsory: false })], { A: 'NOT_STARTED' });
    expect(result.percentComplete).toBe(0);
  });

  it('defaults an unlisted course to not started', () => {
    expect(summarise([course('A')], {}).counts.NOT_STARTED).toBe(1);
  });
});
