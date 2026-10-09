import { ExternalLink } from 'lucide-react';
import type { PlanFormat } from '@/lib/programs';

/** The source prose is retained verbatim when course structure cannot be mapped safely. */
export default function SyllabusView({
  planFormat,
  layout,
  entryRequirements,
  sourceUrl,
  programmeUrl,
  hideEntryRequirements = false,
}: {
  planFormat: PlanFormat;
  layout: string[];
  entryRequirements: string | null;
  sourceUrl: string;
  programmeUrl: string;
  hideEntryRequirements?: boolean;
}) {
  return (
    <div className="space-y-6">
      <p className="max-w-[68ch] text-[0.9375rem] leading-relaxed text-muted-foreground">
        {planFormat === 'syllabus'
          ? "We could not establish a verified course map from the available programme data. The university's syllabus may describe course names, choices and credits in prose; read the original source text below."
          : "We could not establish a verified course map from the available programme data. The university's study plan may describe course names, choices and credits in prose; read the original source text below."}
      </p>

      {layout.length > 0 ? (
        <section className="rounded-lg border border-border bg-card p-5">
          <h2 className="font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground">
            The programme syllabus
          </h2>
          <div className="mt-4 space-y-3">
            {layout.map((paragraph, index) => (
              <p
                key={index}
                className="max-w-[72ch] text-[0.9375rem] leading-relaxed text-foreground"
              >
                {paragraph}
              </p>
            ))}
          </div>
        </section>
      ) : null}

      {hideEntryRequirements ? (
        <p className="max-w-[68ch] text-[0.9375rem] leading-relaxed text-muted-foreground">
          Entry requirements vary by subject profile. See the requirements for
          this specific programme on{' '}
          <a
            href={programmeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-foreground"
          >
            the university programme page
          </a>
          .
        </p>
      ) : entryRequirements ? (
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
