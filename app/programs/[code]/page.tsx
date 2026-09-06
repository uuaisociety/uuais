import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
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

/** All 270 prerendered, since plans only change when the faculty is re-scraped. That is why
 *  the specialisation filter is client-side: server `searchParams` would break static. */
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
  // Roughly half these pages have no map and no semester count, and the description is what
  // search results and link previews show — so it has to describe the page that exists.
  const credits = `${program.totalCredits} hp`;
  const named = (program.syllabusCourses ?? []).length;
  return {
    title: primary,
    description: program.courses.length > 0
      ? `Course map for ${program.nameSv} (${program.code}) — ${credits} across ${program.semesters} semesters.`
      : named > 0
        ? `The ${named} courses named in the programme syllabus for ${program.nameSv} (${program.code}) — ${credits}.`
        : `${program.nameSv} (${program.code}), ${credits}. Uppsala University publishes no course list for this programme.`,
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
      {/* The wide container exists for the map; a page of prose reads at a normal measure. */}
      <div className={`mx-auto px-4 sm:px-6 lg:px-8 ${hasMap ? "max-w-[110rem]" : "max-w-[70rem]"}`}>
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
          {/* The sidebar carries this on a map page; without one, a reader who has landed on
              the wrong degree would have to find their way back through the site nav. */}
          {!hasMap ? (
            <Link
              href="/programs"
              className="mt-3 inline-flex items-center gap-1.5 rounded-sm font-mono text-[0.6875rem] uppercase tracking-[0.1em] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ArrowLeft aria-hidden className="h-3 w-3" />
              All programmes
            </Link>
          ) : null}
        </header>

        <div className="mb-8">
          <AccuracyNotice
            kind={hasMap ? "map" : "syllabus"}
            hasCourses={hasMap || (program.syllabusCourses ?? []).length > 0}
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
