import mbv2m from '@/data/programs/mbv2m.json';
import {
  courseSemesterSpans,
  courseSpanCaptions,
} from '@/components/programs/ProgramCourseNode';

describe('courseSemesterSpans', () => {
  it('counts repeated source placements even when layout merges them into one node', () => {
    const repeatedCourses = mbv2m.courses.filter((course) =>
      ['3KK023', '3KK024'].includes(course.code),
    );
    const spans = courseSemesterSpans(repeatedCourses);

    expect(spans.get('3KK023')?.size).toBe(2);
    expect(spans.get('3KK024')?.size).toBe(2);
  });
});

describe('courseSpanCaptions', () => {
  it('labels total-course credit rows that repeat across semesters', () => {
    expect(courseSpanCaptions(2, 1)).toEqual(['Spans 2 semesters']);
  });

  it('labels both semester and period spans when both apply', () => {
    expect(courseSpanCaptions(8, 2)).toEqual([
      'Spans 8 semesters',
      'Spans 2 periods',
    ]);
  });

  it('does not add a span caption for a course in one semester and period', () => {
    expect(courseSpanCaptions(1, 1)).toEqual([]);
  });
});
