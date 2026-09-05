import type { Metadata } from "next";
import { AlertTriangle } from "lucide-react";
import { getProgramIndex, programSlug } from "@/lib/programs";
import ProgramFinder from "@/components/programs/ProgramFinder";

export const metadata: Metadata = {
  title: "Programmes",
  description:
    "Explore Uppsala University degree programmes as a course map: semesters, specialisations and how courses connect.",
};

export default function ProgramsPage() {
  const { programmes, scrapedAt } = getProgramIndex();
  const retrieved = new Date(scrapedAt);
  const rows = programmes.map((entry) => ({ ...entry, slug: programSlug(entry) }));

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-semibold tracking-[-0.032em] text-foreground sm:text-4xl">
          Programmes
        </h1>
        <p className="mt-3 max-w-[62ch] text-muted-foreground">
          See a whole degree at once — every semester, how the courses depend on each
          other, and where your specialisation branches off.
        </p>
        {/* Caveat and retrieval date are one provenance fact, so they share a block. */}
        <div className="mt-6 max-w-[62ch] rounded-lg border border-border bg-card p-4">
          <p className="flex gap-3 text-[0.9375rem] leading-relaxed text-muted-foreground">
            <span
              aria-hidden
              className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-sm bg-[var(--chart-3)]/15 text-[var(--chart-3)]"
            >
              <AlertTriangle className="h-3.5 w-3.5" />
            </span>
            <span>
              These maps are generated automatically from the university&rsquo;s study
              plans and have{" "}
              <span className="font-medium text-foreground">
                not been reviewed by a human
              </span>
              . Always confirm against the official pages before choosing a course.
            </span>
          </p>
          {Number.isNaN(retrieved.valueOf()) ? null : (
            <p className="mt-3 border-t border-border pt-3 font-mono text-[0.6875rem] text-muted-foreground">
              Retrieved{" "}
              {retrieved.toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </p>
          )}
        </div>

        <ProgramFinder programmes={rows} />
      </div>
    </div>
  );
}
