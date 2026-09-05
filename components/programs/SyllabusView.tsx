import { ExternalLink } from "lucide-react";
import type { PlanFormat, SyllabusCourse } from "@/lib/programs";

/**
 * What a programme gets when there is no course map: UU publishes no study plan, or one that
 * describes each semester in prose. Either way the courses are named but never coded.
 */
export default function SyllabusView({
  planFormat,
  courses,
  layout,
  entryRequirements,
  sourceUrl,
}: {
  planFormat: PlanFormat;
  courses: SyllabusCourse[];
  layout: string[];
  entryRequirements: string | null;
  sourceUrl: string;
}) {
  const bySemester = new Map<number, SyllabusCourse[]>();
  const unplaced: SyllabusCourse[] = [];
  for (const course of courses) {
    if (course.semester === null) unplaced.push(course);
    else bySemester.set(course.semester, [...(bySemester.get(course.semester) ?? []), course]);
  }
  const semesters = [...bySemester.keys()].sort((a, b) => a - b);

  return (
    <div className="max-w-[70rem] space-y-6">
      <p className="max-w-[68ch] text-[0.9375rem] leading-relaxed text-muted-foreground">
        {planFormat === "syllabus"
          ? "Uppsala University publishes no course-by-course study plan for this programme, only the programme syllabus below."
          : "This programme's study plan describes each semester in prose rather than listing its courses."}{" "}
        The courses it names carry no course codes, so they cannot be linked to their syllabuses
        or drawn as a map.
      </p>

      {courses.length > 0 ? (
        <section className="rounded-lg border border-border bg-card p-5">
          <h2 className="font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground">
            Courses named in the plan
            <span className="ml-2 opacity-60">{courses.length}</span>
          </h2>

          {semesters.map((semester) => (
            <div key={semester} className="mt-4">
              <h3 className="rounded-sm bg-muted px-1.5 py-0.5 font-mono text-[0.6875rem] uppercase tracking-[0.1em] text-muted-foreground inline-block">
                Semester {semester}
              </h3>
              <ul className="mt-2 divide-y divide-border border-t border-border">
                {bySemester.get(semester)!.map((course, index) => (
                  <li
                    key={`${course.title}-${index}`}
                    className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-2.5"
                  >
                    <span className="text-[0.9375rem] text-foreground">{course.title}</span>
                    {course.credits ? (
                      <span className="font-mono text-[0.6875rem] text-muted-foreground">
                        {course.credits} hp
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {unplaced.length > 0 ? (
            <ul
              className={`divide-y divide-border border-t border-border ${semesters.length > 0 ? "mt-6" : "mt-4"}`}
            >
              {unplaced.map((course, index) => (
                <li
                  key={`${course.title}-${index}`}
                  className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-2.5"
                >
                  <span className="text-[0.9375rem] text-foreground">{course.title}</span>
                  {course.credits ? (
                    <span className="font-mono text-[0.6875rem] text-muted-foreground">
                      {course.credits} hp
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}

      {layout.length > 0 ? (
        <section className="rounded-lg border border-border bg-card p-5">
          <h2 className="font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground">
            The programme syllabus
          </h2>
          <div className="mt-4 space-y-3">
            {layout.map((paragraph, index) => (
              <p key={index} className="max-w-[72ch] text-[0.9375rem] leading-relaxed text-foreground">
                {paragraph}
              </p>
            ))}
          </div>
        </section>
      ) : null}

      {entryRequirements ? (
        <section className="rounded-lg border border-border bg-card p-5">
          <h2 className="font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground">
            Entry requirements
          </h2>
          <p className="mt-3 max-w-[72ch] text-[0.9375rem] leading-relaxed text-foreground">
            {entryRequirements}
          </p>
        </section>
      ) : null}

      <a
        href={sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 rounded-sm font-mono text-[0.6875rem] uppercase tracking-[0.1em] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Read it at uu.se
        <ExternalLink aria-hidden className="h-3 w-3" />
      </a>
    </div>
  );
}
