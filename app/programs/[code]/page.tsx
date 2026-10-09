import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { notFound } from 'next/navigation';
import {
  getProgram,
  getProgramIndex,
  getSpecialisations,
  isProgramMapBlocked,
  programSlug,
} from '@/lib/programs';
import { programDisplayNames } from '@/lib/programs/format';
import ProgramExplorer from '@/components/programs/ProgramExplorer';
import SyllabusView from '@/components/programs/SyllabusView';
import AccuracyNotice from '@/components/programs/AccuracyNotice';
import ReportErrorDialog from '@/components/programs/ReportErrorDialog';

type Params = { code: string };

/** All 270 prerendered, since plans only change when the faculty is re-scraped. That is why
 *  the specialisation filter is client-side: server `searchParams` would break static. */
export function generateStaticParams(): Params[] {
  return getProgramIndex().programmes.map((entry) => ({
    code: programSlug(entry),
  }));
}

export const dynamicParams = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { code } = await params;
  const program = getProgram(code);
  if (!program) return { title: 'Programme' };

  const { primary } = programDisplayNames(
    program.programmeTitle || program.nameSv,
    program.programmeTitleEn,
  );
  // Roughly half these pages have no map and no semester count, and the description is what
  // search results and link previews show — so it has to describe the page that exists.
  const credits = `${program.totalCredits} hp`;
  const blocked = isProgramMapBlocked(program);
  return {
    title: primary,
    description: blocked
      ? `${program.nameSv} (${program.code}) — consult Uppsala University's official study plan.`
      : program.courses.length > 0
        ? `Course map for ${program.nameSv} (${program.code}) — ${credits} across ${program.semesters} semesters.`
        : `The programme syllabus and source notes for ${program.nameSv} (${program.code}) — ${credits}.`,
  };
}

export default async function ProgramPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { code } = await params;
  const program = getProgram(code);
  if (!program) notFound();

  const mapBlocked = isProgramMapBlocked(program);
  const hasMap = program.courses.length > 0 && !mapBlocked;
  const title = programDisplayNames(
    program.programmeTitle || program.nameSv,
    program.programmeTitleEn,
  );

  return (
    <div className="min-h-screen pt-24 pb-16">
      {/* The wide container exists for the map; a page of prose reads at a normal measure. */}
      <div
        className={`mx-auto px-4 sm:px-6 lg:px-8 ${hasMap ? 'max-w-[110rem]' : 'max-w-[70rem]'}`}
      >
        <header className="mb-6">
          <h1 className="text-3xl font-semibold tracking-[-0.032em] text-foreground [hyphens:auto] break-words sm:text-4xl">
            {title.primary}
          </h1>
          {title.secondary ? (
            <p className="mt-1 text-[1.0625rem] text-muted-foreground">
              {title.secondary}
            </p>
          ) : null}
          <p className="mt-2 text-muted-foreground">
            {hasMap
              ? 'Explore the programme structure and how courses connect.'
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
            kind={hasMap || mapBlocked ? 'map' : 'syllabus'}
            hasCourses={
              mapBlocked
                ? false
                : hasMap || (program.syllabusCourses ?? []).length > 0
            }
            blocked={mapBlocked}
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

        {mapBlocked ? (
          <section
            aria-labelledby="map-unavailable"
            className="rounded-lg border border-border bg-card p-6"
          >
            <h2 id="map-unavailable" className="text-xl font-semibold">
              Course map unavailable
            </h2>
            <p className="mt-2 text-muted-foreground">
              The source structure could not be verified well enough to show a
              map. Use the official study plan for course choices and programme
              requirements.
            </p>
            {program.safety?.issues.length ? (
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                {[
                  ...new Map(
                    program.safety.issues.map((issue) => {
                      const text =
                        issue.textEn || issue.textSv || issue.message;
                      return [text, issue] as const;
                    }),
                  ).values(),
                ].map((issue, index) => (
                  <li key={`${issue.kind}-${index}`}>
                    {issue.textEn || issue.textSv || issue.message}
                  </li>
                ))}
              </ul>
            ) : null}
            <a
              href={program.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex underline underline-offset-4"
            >
              Open the official study plan
            </a>
          </section>
        ) : !hasMap ? (
          // No coded courses means no graph to draw, whatever the source was.
          <SyllabusView
            planFormat={program.planFormat}
            layout={program.syllabusLayout ?? []}
            entryRequirements={program.syllabusEntryRequirements ?? null}
            sourceUrl={program.sourceUrl}
            programmeUrl={`https://www.uu.se${program.programmeUri}`}
            hideEntryRequirements={program.code === 'UGY2Y'}
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
            rules={program.rules.map((rule) =>
              rule.source === 'llm' ? { ...rule, labelEn: null } : rule,
            )}
          />
        )}

        {program.planFormat !== 'syllabus' &&
        program.safety?.status === 'warning' &&
        program.safety.issues.length > 0 ? (
          <aside
            aria-label="Source text not arranged as course rows"
            className="mt-6 mb-6 rounded-lg border border-border bg-card p-4"
          >
            <h2 className="text-base font-semibold">
              Additional source text is not arranged as course rows
            </h2>
            <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
              {program.safety.issues.map((issue, index) => {
                const track = issue.trackId
                  ? program.tracks.find((item) => item.id === issue.trackId)
                  : null;
                const trackName = track?.profileSv || track?.specialisationSv;
                return (
                  <li key={`${issue.kind}-${issue.semester ?? 'all'}-${index}`}>
                    {issue.semester ? `Semester ${issue.semester}: ` : ''}
                    {trackName ? `Specialisation ${trackName}: ` : ''}
                    {issue.textEn || issue.textSv || issue.message}
                    {issue.textEn && issue.textSv ? (
                      <span className="block">{issue.textSv}</span>
                    ) : null}
                  </li>
                );
              })}
            </ul>
            <p className="mt-3 text-sm text-muted-foreground">
              These source notes preserve information that could not be
              represented as course rows. Check the official study plan for
              details and restrictions.
            </p>
          </aside>
        ) : null}
      </div>
    </div>
  );
}
