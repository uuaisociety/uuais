import React from "react";
import { AlertTriangle, ExternalLink } from "lucide-react";

/**
 * Says where this map comes from and what it is not: the links and rules are extracted by a
 * language model and unchecked, so the caveat sits above the map with its source link.
 */
/**
 * UU states validity as "Studieplan giltig från och med höstterminen 2026"; only the term and
 * the year carry meaning here, so it is restated in English rather than shown as-is.
 */
function validityLabel(validFrom: string | null): string | null {
  if (!validFrom) return null;
  const year = /(\d{4})/.exec(validFrom)?.[1];
  if (!year) return null;
  const term = /höst/i.test(validFrom) ? "autumn" : /vår/i.test(validFrom) ? "spring" : null;
  return term ? `Valid from ${term} ${year}` : `Valid from ${year}`;
}

export default function AccuracyNotice({
  validFrom,
  scrapedAt,
  sourceUrl,
  reviewed,
  report,
  /** A syllabus page has no arrows, no rules and no map, so it must not promise them. */
  kind = "map",
}: {
  validFrom: string | null;
  scrapedAt: string;
  sourceUrl: string;
  reviewed: boolean;
  kind?: "map" | "syllabus";
  /** The reporting control, rendered where the caveat is made. */
  report?: React.ReactNode;
}) {
  const scraped = new Date(scrapedAt);
  const scrapedLabel = Number.isNaN(scraped.valueOf())
    ? null
    : scraped.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

  return (
    // A full amber wash across a 1400px panel read as an error banner, so the one warm accent
    // is the mark beside the heading; two columns keep the caveat at a readable measure.
    <aside className="rounded-lg border border-border bg-card p-4 sm:p-5 lg:flex lg:items-start lg:gap-8">
      <div className="flex gap-3 lg:flex-1">
        <span
          aria-hidden
          className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-sm bg-[var(--chart-3)]/15 text-[var(--chart-3)]"
        >
          <AlertTriangle className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0">
          <p className="text-[1.0625rem] font-semibold leading-tight tracking-[-0.028em] text-foreground">
            {kind === "syllabus"
              ? "Taken from Uppsala University's programme syllabus"
              : reviewed
                ? "Generated from Uppsala University's study plan"
                : "Generated automatically — not reviewed by a human"}
          </p>
          {/* Capped at a readable measure: the panel is as wide as the map. */}
          <p className="mt-2 max-w-[68ch] text-[0.9375rem] leading-relaxed text-muted-foreground">
            {kind === "syllabus" ? (
              <>
                The course names below are read out of the syllabus&rsquo; own prose, which
                carries no course codes and may be out of date.{" "}
                <span className="font-medium text-foreground">
                  Always confirm against the official pages before choosing or applying for a
                  course.
                </span>{" "}
                This is a study aid, not an authoritative source, and it is not the degree
                requirements.
              </>
            ) : (
              <>
                The prerequisite arrows and the rules below them are extracted by a language
                model from the university&rsquo;s published study plan and course syllabuses.
                They can be wrong, incomplete, or out of date.{" "}
                <span className="font-medium text-foreground">
                  Always confirm against the official pages before choosing or applying for a
                  course.
                </span>{" "}
                This map is a study aid, not an authoritative source, and it is not the
                degree requirements.
              </>
            )}
          </p>
        </div>
      </div>

      {/* Stacked rather than run together: a wrapped inline dot reads as a typo. */}
      <dl className="mt-4 flex flex-col gap-2 border-t border-border pt-3 font-mono text-[0.6875rem] text-muted-foreground sm:flex-row sm:flex-wrap sm:gap-x-8 lg:mt-0 lg:w-64 lg:shrink-0 lg:flex-col lg:gap-y-3 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
        {validityLabel(validFrom) ? (
          <div>
            <dt className="uppercase tracking-[0.12em] opacity-70">Study plan</dt>
            <dd className="mt-1 text-foreground">{validityLabel(validFrom)}</dd>
          </div>
        ) : null}
        {scrapedLabel ? (
          <div>
            <dt className="uppercase tracking-[0.12em] opacity-70">Retrieved</dt>
            <dd className="mt-1 text-foreground">{scrapedLabel}</dd>
          </div>
        ) : null}
        <div>
          <dt className="uppercase tracking-[0.12em] opacity-70">Source</dt>
          <dd className="mt-1">
            <a
              href={sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-fit items-center gap-1 rounded-sm text-foreground underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {kind === "syllabus" ? "Programme syllabus" : "Official study plan"}
              <ExternalLink className="h-3 w-3" />
            </a>
          </dd>
        </div>
        {report ? <div className="pt-1">{report}</div> : null}
      </dl>
    </aside>
  );
}
