import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getProgram,
  getProgramIndex,
  getSpecialisations,
  programSlug,
} from "@/lib/programs";
import { programDisplayNames } from "@/lib/programs/format";
import ProgramExplorer from "@/components/programs/ProgramExplorer";
import SyllabusView from "@/components/programs/SyllabusView";
import AccuracyNotice from "@/components/programs/AccuracyNotice";
import ReportErrorDialog from "@/components/programs/ReportErrorDialog";

type Params = { code: string };

/** All 77 prerendered, since the plans only change when the faculty is re-scraped. That is
 *  why the specialisation filter is client-side: server `searchParams` would break static. */
export function generateStaticParams(): Params[] {
  return getProgramIndex().programmes.map((entry) => ({ code: programSlug(entry) }));
}

export const dynamicParams = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { code } = await params;
  const program = getProgram(code);
  if (!program) return { title: "Programme" };

  const { primary } = programDisplayNames(
    program.programmeTitle || program.nameSv,
    program.programmeTitleEn
  );
  return {
    title: primary,
    description: `Course map for ${program.nameSv} (${program.code}) — ${program.totalCredits} hp across ${program.semesters} semesters.`,
  };
}

export default async function ProgramPage({ params }: { params: Promise<Params> }) {
  const { code } = await params;
  const program = getProgram(code);
  if (!program) notFound();

  const hasMap = program.courses.length > 0;
  const title = programDisplayNames(
    program.programmeTitle || program.nameSv,
    program.programmeTitleEn
  );

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="mx-auto max-w-[110rem] px-4 sm:px-6 lg:px-8">
        <header className="mb-6">
          <h1 className="text-3xl font-semibold tracking-[-0.032em] text-foreground [hyphens:auto] break-words sm:text-4xl">
            {title.primary}
          </h1>
          {title.secondary ? (
            <p className="mt-1 text-[1.0625rem] text-muted-foreground">{title.secondary}</p>
          ) : null}
          <p className="mt-2 text-muted-foreground">
            {hasMap
              ? "Explore the programme structure and how courses connect."
              : "What the university publishes about this programme's structure."}
          </p>
        </header>

        <div className="mb-8">
          <AccuracyNotice
            kind={hasMap ? "map" : "syllabus"}
            validFrom={program.validFrom}
            scrapedAt={program.scrapedAt}
            sourceUrl={program.sourceUrl}
            reviewed={program.reviewed}
            report={
              <ReportErrorDialog
                programSlug={code}
                programName={title.primary}
                trackId={null}
              />
            }
          />
        </div>

        {!hasMap ? (
          // No coded courses means no graph to draw, whatever the source was.
          <SyllabusView
            planFormat={program.planFormat}
            courses={program.syllabusCourses ?? []}
            layout={program.syllabusLayout ?? []}
            entryRequirements={program.syllabusEntryRequirements ?? null}
            sourceUrl={program.sourceUrl}
          />
        ) : (
        <ProgramExplorer
          program={{
            code: program.code,
            nameSv: program.nameSv,
            displayName: title.primary,
            displayNameSv: title.secondary,
            totalCredits: program.totalCredits,
            semesters: program.semesters,
          }}
          specialisations={getSpecialisations(program)}
          courses={program.courses}
          tracks={program.tracks}
          edges={program.edges}
          rules={program.rules}
        />
        )}
      </div>
    </div>
  );
}
