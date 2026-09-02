"use client";

import React, { useState } from "react";
import { AlertTriangle, Check, Flag } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import type { ProgramFeedbackKind } from "@/lib/firestore/program-feedback";

const KINDS: { value: ProgramFeedbackKind; label: string }[] = [
  { value: "wrong-prerequisite", label: "A prerequisite arrow is wrong" },
  { value: "missing-course", label: "A course is missing or misplaced" },
  { value: "wrong-rule", label: "A study-plan rule is wrong" },
  { value: "other", label: "Something else" },
];

const FIELD =
  "mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-[0.9375rem] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring";
const LEGEND = "font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-muted-foreground";

/**
 * Lets a reader report what the extraction got wrong; it sits beside the notice admitting
 * the data may be wrong, because that is the moment a reader doubts it.
 */
export default function ReportErrorDialog({
  programSlug,
  programName,
  trackId,
}: {
  programSlug: string;
  programName: string;
  trackId: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSending(true);
    setError(null);
    try {
      const response = await fetch("/api/programs/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          programSlug,
          programName,
          trackId,
          kind: form.get("kind"),
          courseCode: form.get("courseCode"),
          message: form.get("message"),
          contact: form.get("contact"),
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Could not send the report.");
      setSent(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not send the report.");
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        icon={Flag}
        onClick={() => {
          setSent(false);
          setError(null);
          setOpen(true);
        }}
      >
        Report an error
      </Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Report an error"
        description={programName}
        size="sm"
      >
        {sent ? (
          <div>
            <p className="flex items-start gap-2 text-[0.9375rem] leading-relaxed text-foreground">
              <Check aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-[var(--chart-4)]" />
              Thank you — the report reached the board. Corrections are applied when the map
              is next rebuilt, so the page may not change straight away.
            </p>
            <Button className="mt-4" onClick={() => setOpen(false)}>
              Close
            </Button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <label className="block">
              <span className={LEGEND}>What is wrong</span>
              <select name="kind" defaultValue="wrong-prerequisite" className={FIELD}>
                {KINDS.map((kind) => (
                  <option key={kind.value} value={kind.value}>
                    {kind.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className={LEGEND}>
                Course code <span className="normal-case tracking-normal">(optional)</span>
              </span>
              <input name="courseCode" placeholder="e.g. 1FA535" className={`${FIELD} font-mono`} />
            </label>

            <label className="block">
              <span className={LEGEND}>What should it say</span>
              <textarea
                name="message"
                required
                rows={4}
                maxLength={2000}
                placeholder="Quantum Physics F does not require Mechanics Basic Course — the study plan says Mechanics II."
                className={`${FIELD} resize-y leading-relaxed`}
              />
            </label>

            <label className="block">
              <span className={LEGEND}>
                Email <span className="normal-case tracking-normal">(optional)</span>
              </span>
              <input
                name="contact"
                type="email"
                placeholder="Only if you want to hear back"
                className={FIELD}
              />
            </label>

            {error ? (
              <p className="flex items-start gap-2 text-[0.9375rem] text-foreground">
                <AlertTriangle
                  aria-hidden
                  className="mt-0.5 h-4 w-4 shrink-0 text-[var(--chart-3)]"
                />
                {error}
              </p>
            ) : null}

            <div className="flex items-center justify-end gap-2 pt-1">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="cta" isLoading={sending}>
                {sending ? "Sending…" : "Send report"}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
