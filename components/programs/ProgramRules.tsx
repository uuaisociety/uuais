"use client";

import React from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { ProgramRule, ProgramRuleType } from "@/lib/programs";
import { courseHref } from "@/lib/programs/format";

const RULE_LABEL: Record<ProgramRuleType, string> = {
  CHOOSE_ONE: "Choose one",
  MUTUALLY_EXCLUSIVE: "Cannot combine",
  COHORT_SUBSTITUTION: "Older intake",
  RECOMMENDED: "Recommended",
  EITHER_OR: "Either / or",
  NOTE: "Note",
};

/**
 * The study plan's prose notes, classified. The university's own wording is kept beneath the
 * English label because the classification is machine-generated.
 */
export default function ProgramRules({
  rules,
  selectedCode = null,
  selectedTitle = null,
  totalRules,
  onClearSelection,
  fromPath,
}: {
  rules: ProgramRule[];
  selectedCode?: string | null;
  selectedTitle?: string | null;
  totalRules?: number;
  onClearSelection?: () => void;
  fromPath?: string;
}) {
  const ordered = [...rules].sort((a, b) => a.semester - b.semester);

  return (
    <section className="rounded-lg border border-border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <h2 className="font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground">
          Rules from the study plan
          {totalRules ? <span className="ml-2 opacity-60">{totalRules}</span> : null}
        </h2>
        {selectedCode ? (
          <Button
            variant="outline"
            size="sm"
            onClick={onClearSelection}
            className="h-auto gap-1.5 rounded-sm border-[var(--chart-2)]/50 bg-[var(--chart-2)]/10 px-2 py-1 text-[0.6875rem] font-normal hover:border-[var(--chart-2)]/50 hover:bg-[var(--chart-2)]/20"
          >
            <span className="font-mono text-[0.6875rem]">{selectedCode}</span>
            {selectedTitle ? <span className="max-w-[14rem] truncate">{selectedTitle}</span> : null}
            <X className="h-3 w-3 opacity-70" />
          </Button>
        ) : (
          // The gesture differs by input device, and the map accepts both: a
          // right-click with a mouse, a first tap with a finger.
          <span className="font-mono text-[0.6875rem] text-muted-foreground">
            <span className="pointer-coarse:hidden">Right-click a course to filter these</span>
            <span className="hidden pointer-coarse:inline">Tap a course to filter these</span>
          </span>
        )}
      </div>

      {selectedCode && ordered.length === 0 ? (
        <p className="mt-4 text-[0.9375rem] text-muted-foreground">
          No study-plan rule mentions {selectedCode}.
          {totalRules ? ` Clear the selection to see all ${totalRules}.` : ""}
        </p>
      ) : null}
      {/* Hairline separators rather than a side rail: the rail read as a colour-coded
          accent it never was, and the rules are a list, not quotations. */}
      <ul className="mt-4 divide-y divide-border border-t border-border">
        {ordered.map((rule) => (
          <li key={rule.id} className="py-4 first:pt-4 last:pb-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-sm bg-muted px-1.5 py-0.5 font-mono text-[0.6875rem] uppercase tracking-[0.1em] text-muted-foreground">
                Sem {rule.semester}
              </span>
              <span className="rounded-sm bg-accent px-1.5 py-0.5 font-mono text-[0.6875rem] uppercase tracking-[0.1em] text-accent-foreground">
                {RULE_LABEL[rule.type]}
              </span>
              {rule.courseCodes.map((code) => (
                <a
                  key={code}
                  href={courseHref(code, fromPath)}
                  className="rounded-sm font-mono text-[0.6875rem] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {code}
                </a>
              ))}
            </div>
            {rule.labelEn ? (
              <p className="mt-2 max-w-[72ch] text-[0.9375rem] leading-relaxed text-foreground">
                {rule.labelEn}
              </p>
            ) : null}
            <p className="mt-1 max-w-[72ch] text-xs leading-relaxed text-muted-foreground">
              {rule.textSv}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
