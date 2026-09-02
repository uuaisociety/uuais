import {
  categoriseCourse,
  getProgram,
  getProgramIndex,
  programSlug,
  getSpecialisations,
  getVisibleCourses,
  getVisibleEdges,
  getVisibleRules,
  groupBySemester,
  listPrograms,
  type Program,
  type ProgramCourse,
} from '@/lib/programs';

const program = getProgram('TTF2Y') as Program;

describe('getProgram', () => {
  it('loads the Engineering Physics programme', () => {
    expect(program).not.toBeNull();
    expect(program.code).toBe('TTF2Y');
    expect(program.totalCredits).toBe(300);
    expect(program.semesters).toBe(10);
  });

  it('is case insensitive', () => {
    expect(getProgram('ttf2y')?.code).toBe('TTF2Y');
  });

  it('returns null for an unknown programme', () => {
    expect(getProgram('NOPE')).toBeNull();
  });

  it('lists the available programmes', () => {
    expect(listPrograms().map((p) => p.code)).toContain('TTF2Y');
  });
});

describe('programme data integrity', () => {
  it('has the 172 distinct courses of the study plan', () => {
    expect(new Set(program.courses.map((c) => c.code)).size).toBe(172);
  });

  it('places every course in a semester the programme has', () => {
    for (const course of program.courses) {
      expect(course.semester).toBeGreaterThanOrEqual(1);
      expect(course.semester).toBeLessThanOrEqual(program.semesters);
    }
  });

  it('references only known tracks', () => {
    const known = new Set(program.tracks.map((t) => t.id));
    for (const course of program.courses) {
      if (course.trackId) expect(known.has(course.trackId)).toBe(true);
    }
  });

  it('merges a course split across two periods into one entry', () => {
    // 1MA360 is listed in both periods of semester 1 as "5 av 10 hp".
    const rows = program.courses.filter((c) => c.code === '1MA360');
    expect(rows).toHaveLength(1);
    expect(rows[0].credits).toBe(10);
    expect(rows[0].creditsInPeriod).toBe(5);
    expect(rows[0].periods).toEqual(['Period 1', 'Period 2']);
  });

  it('splits a course spanning two semesters across both, without double counting', () => {
    // 1FA105 (10 hp) runs in semester 1 period 2 and semester 2 period 3.
    const rows = program.courses.filter((c) => c.code === '1FA105');
    expect(rows.map((r) => r.semester).sort()).toEqual([1, 2]);
    expect(rows.every((r) => r.credits === 10)).toBe(true);
    expect(rows.reduce((sum, r) => sum + (r.creditsInSemester ?? 0), 0)).toBe(10);
  });

  it('gives the trunk semesters their real credit load', () => {
    const groups = groupBySemester(program, getVisibleCourses(program, null));
    const credits = Object.fromEntries(groups.map((g) => [g.semester, g.credits]));
    // A full-time semester is 30 hp. Semesters 3 and 6 list either/or alternatives
    // that both carry the compulsory flag, so their listed sum differs until the
    // choose-one rules are extracted.
    expect(credits[1]).toBe(30);
    expect(credits[2]).toBe(30);
    expect(credits[4]).toBe(30);
    expect(credits[5]).toBe(30);
    expect(credits[10]).toBe(30);
  });

  it('keeps semesters 1-6 and the thesis semester free of tracks', () => {
    const trunk = new Set(
      program.courses.filter((c) => c.trackId === null).map((c) => c.semester)
    );
    expect([...trunk].sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 10]);
  });
});

describe('getSpecialisations', () => {
  const specialisations = getSpecialisations(program);

  it('collapses 11 tracks into the 5 specialisations of the programme', () => {
    expect(specialisations).toHaveLength(5);
  });

  it('nests profiles under their specialisation', () => {
    const applied = specialisations.find((s) => s.id === 'tillampad-fysik');
    expect(applied?.profiles.map((p) => p.profileSv).sort()).toEqual(['Fysik', 'Kvantteknologi']);
    expect(applied?.baseTrackId).toBe('tillampad-fysik');
  });

  it('normalises the specialisation UU spells with inconsistent casing', () => {
    // The study plan writes both "Inriktning beräkningsteknik" and
    // "Inriktning Beräkningsteknik, profil ...".
    const computational = specialisations.find((s) => s.id === 'berakningsteknik');
    expect(computational).toBeDefined();
    expect(computational?.profiles).toHaveLength(2);
  });

  it('carries the description prose that shares a node with the header', () => {
    const embedded = specialisations.find((s) => s.id === 'inbyggda-system');
    expect(embedded?.descriptionSv).toContain('fördjupningsprofiler');
  });
});

describe('getVisibleCourses', () => {
  it('shows only the trunk when no track is selected', () => {
    const visible = getVisibleCourses(program, null);
    expect(visible.every((c) => c.trackId === null)).toBe(true);
    expect(visible.length).toBeLessThan(program.courses.length);
  });

  it('adds the selected track to the trunk', () => {
    const visible = getVisibleCourses(program, 'elektrifiering');
    expect(new Set(visible.map((c) => c.trackId))).toEqual(new Set([null, 'elektrifiering']));
  });

  it('lets a profile inherit its bare specialisation courses', () => {
    const visible = getVisibleCourses(program, 'tillampad-fysik__kvantteknologi');
    const tracks = new Set(visible.map((c) => c.trackId));
    expect(tracks).toContain('tillampad-fysik__kvantteknologi');
    expect(tracks).toContain('tillampad-fysik');
    expect(tracks).toContain(null);
  });

  it('never leaks one specialisation into another', () => {
    const visible = getVisibleCourses(program, 'elektrifiering');
    expect(visible.some((c) => c.trackId === 'inbyggda-system')).toBe(false);
  });
});

describe('groupBySemester', () => {
  it('returns one bucket per semester, in order', () => {
    const groups = groupBySemester(program, getVisibleCourses(program, null));
    expect(groups).toHaveLength(10);
    expect(groups.map((g) => g.semester)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it('counts only compulsory credits toward a semester total', () => {
    // Semester 10 is the 30 hp thesis plus a large pool of free electives.
    const groups = groupBySemester(program, getVisibleCourses(program, null));
    expect(groups[9].credits).toBe(30);
  });

  it('leaves track semesters empty when no track is selected', () => {
    const groups = groupBySemester(program, getVisibleCourses(program, null));
    expect(groups[6].courses).toHaveLength(0);
  });
});

describe('categoriseCourse', () => {
  const base: Pick<ProgramCourse, 'compulsory' | 'trackId' | 'titleEn' | 'titleSv' | 'credits'> = {
    compulsory: false,
    trackId: null,
    titleEn: 'Something',
    titleSv: 'Något',
    credits: 5,
  };

  it('marks a compulsory trunk course as core', () => {
    expect(categoriseCourse({ ...base, compulsory: true })).toBe('MANDATORY_CORE');
  });

  it('marks the degree project as thesis regardless of compulsoriness', () => {
    expect(
      categoriseCourse({ ...base, titleEn: 'Degree Project in Engineering Physics', credits: 30 })
    ).toBe('PROJECT_THESIS');
  });

  it('treats a non-compulsory course inside a track as a required choice', () => {
    expect(categoriseCourse({ ...base, trackId: 'elektrifiering' })).toBe('MANDATORY_ELECTIVE');
  });

  it('treats a non-compulsory trunk course as a free elective', () => {
    expect(categoriseCourse(base)).toBe('OPTIONAL_ELECTIVE');
  });

  it('categorises every course in the programme', () => {
    expect(program.courses.every((c) => Boolean(c.category))).toBe(true);
  });
});

describe('getVisibleEdges', () => {
  it('drops edges whose endpoints are off screen', () => {
    const courses = [{ code: 'A' }, { code: 'B' }] as ProgramCourse[];
    const edges = getVisibleEdges(
      [
        { from: 'A', to: 'B', type: 'HARD', source: 'llm' },
        { from: 'A', to: 'Z', type: 'HARD', source: 'llm' },
      ],
      courses
    );
    expect(edges).toHaveLength(1);
    expect(edges[0].to).toBe('B');
  });
});

describe('getVisibleRules', () => {
  it('keeps trunk rules and the selected track only', () => {
    const rules = getVisibleRules(program, 'elektrifiering');
    expect(rules.every((r) => r.trackId === null || r.trackId === 'elektrifiering')).toBe(true);
  });
});

describe('provenance', () => {
  // A reader has to be able to tell which year's plan they are looking at, and that
  // nobody has checked the generated links.
  it('records which academic year the plan governs', () => {
    expect(program.validFromYear).toBeGreaterThanOrEqual(2025);
    expect(program.validFrom).toMatch(/\d{4}/);
  });

  it('records when it was retrieved and from where', () => {
    expect(Number.isNaN(Date.parse(program.scrapedAt))).toBe(false);
    expect(program.sourceUrl).toContain('uu.se');
  });

  it('is marked unreviewed until a person has checked it', () => {
    expect(program.reviewed).toBe(false);
  });
});

describe('the faculty index', () => {
  const index = getProgramIndex();

  it('covers the whole technical-natural science faculty', () => {
    expect(index.programmes.length).toBeGreaterThan(70);
    expect(index.faculty).toMatch(/Teknisk-naturvetenskapliga/);
  });

  it('gives every programme a unique address', () => {
    const slugs = index.programmes.map(programSlug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('addresses variants that share a programme code separately', () => {
    // TFY2M and TKE2M each cover seven variants; a bare code would collide.
    const physics = index.programmes.filter((p) => p.code === 'TFY2M');
    expect(physics.length).toBeGreaterThan(1);
    expect(new Set(physics.map(programSlug)).size).toBe(physics.length);
  });

  it('loads every programme it lists', () => {
    for (const entry of index.programmes) {
      const loaded = getProgram(programSlug(entry));
      expect(loaded).not.toBeNull();
      expect(loaded?.courses.length).toBeGreaterThan(0);
    }
  });

  it('finds the specialisations that are not written as "Inriktning"', () => {
    // Elektroteknik writes "Profil mot X"; a narrower parser saw no tracks at all.
    const withTracks = index.programmes.filter((p) => p.tracks > 0).map((p) => p.code);
    expect(withTracks).toEqual(expect.arrayContaining(['TEL2Y', 'TIT2Y', 'TTF2Y']));
  });
});

describe('specialisation without profile-free years', () => {
  // The study plan lists years 4-5 of some specialisations only under their profiles,
  // so the bare option must fall back to the union of them.
  it.each(['berakningsteknik', 'inbyggda-system', 'tillampad-fysik'])(
    'shows semesters 8 and 9 for %s',
    (trackId) => {
      const visible = getVisibleCourses(program, trackId);
      expect(visible.filter((c) => c.semester === 8).length).toBeGreaterThan(0);
      expect(visible.filter((c) => c.semester === 9).length).toBeGreaterThan(0);
    }
  );

  it('gives every selectable track content in years 4 and 5', () => {
    for (const track of program.tracks) {
      const visible = getVisibleCourses(program, track.id);
      for (const semester of [7, 8, 9]) {
        expect(
          visible.filter((c) => c.semester === semester).length
        ).toBeGreaterThan(0);
      }
    }
  });

  it('still keeps one specialisation out of another', () => {
    const visible = getVisibleCourses(program, 'berakningsteknik');
    expect(visible.some((c) => c.trackId?.startsWith('inbyggda'))).toBe(false);
  });

  it('narrows to the profile when one is chosen', () => {
    const all = getVisibleCourses(program, 'berakningsteknik');
    const one = getVisibleCourses(program, 'berakningsteknik__artificiell-intelligens');
    expect(one.length).toBeLessThan(all.length);
  });
});
