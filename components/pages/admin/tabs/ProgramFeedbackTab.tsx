"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import Tag from "@/components/ui/Tag";
import { useNotify } from "@/components/ui/Notifications";
import {
  listProgramFeedback,
  setProgramFeedbackStatus,
  type ProgramFeedback,
} from "@/lib/firestore/program-feedback";
import { Check, RefreshCw, RotateCcw } from "lucide-react";

const KIND_LABEL: Record<ProgramFeedback["kind"], string> = {
  "wrong-prerequisite": "Prerequisite",
  "missing-course": "Missing course",
  "wrong-rule": "Rule",
  other: "Other",
};

export default function ProgramFeedbackTab() {
  const { notify } = useNotify();
  const [reports, setReports] = useState<ProgramFeedback[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResolved, setShowResolved] = useState(false);

  const refresh = useCallback(
    async (opts?: { notify?: boolean }) => {
      setLoading(true);
      try {
        setReports(await listProgramFeedback());
        if (opts?.notify) notify({ type: "success", message: "Reports refreshed." });
      } catch {
        notify({ type: "error", message: "Could not load reports." });
      } finally {
        setLoading(false);
      }
    },
    [notify]
  );

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    refresh();
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [refresh]);

  const visible = useMemo(
    () => reports.filter((r) => showResolved || r.status !== "resolved"),
    [reports, showResolved]
  );
  const openCount = reports.filter((r) => r.status !== "resolved").length;

  async function setStatus(report: ProgramFeedback, status: ProgramFeedback["status"]) {
    try {
      await setProgramFeedbackStatus(report.id, status);
      setReports((current) =>
        current.map((r) => (r.id === report.id ? { ...r, status } : r))
      );
    } catch {
      notify({ type: "error", message: "Could not update the report." });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Programme feedback</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Errors readers found in the generated maps. {openCount} open of {reports.length}.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowResolved((on) => !on)}>
            {showResolved ? "Hide resolved" : "Show resolved"}
          </Button>
          <Button variant="outline" onClick={() => refresh({ notify: true })} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {visible.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-sm text-muted-foreground">
              {reports.length === 0
                ? "No one has reported an error yet."
                : "Nothing open — every report has been dealt with."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-3">
          {visible.map((report) => (
            <li key={report.id}>
              <Card>
                <CardContent className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Tag variant={report.status === "resolved" ? "green" : "yellow"}>
                        {report.status === "resolved" ? "Resolved" : "Open"}
                      </Tag>
                      <Tag variant="gray">{KIND_LABEL[report.kind]}</Tag>
                      <a
                        href={`/programs/${report.programSlug}`}
                        className="text-sm text-foreground underline-offset-2 hover:underline"
                      >
                        {report.programName || report.programSlug}
                      </a>
                      {report.courseCode ? (
                        <a
                          href={`/explore/${report.courseCode}`}
                          className="font-mono text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                        >
                          {report.courseCode}
                        </a>
                      ) : null}
                    </div>
                    <span className="font-mono text-[0.6875rem] text-muted-foreground">
                      {new Date(report.createdAt).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>

                  <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                    {report.message}
                  </p>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    {report.contact ? (
                      <a
                        href={`mailto:${report.contact}`}
                        className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                      >
                        {report.contact}
                      </a>
                    ) : (
                      <span className="text-xs text-muted-foreground">No contact given</span>
                    )}
                    <Button
                      variant="outline"
                      onClick={() =>
                        setStatus(report, report.status === "resolved" ? "open" : "resolved")
                      }
                    >
                      {report.status === "resolved" ? (
                        <>
                          <RotateCcw className="mr-2 h-4 w-4" />
                          Reopen
                        </>
                      ) : (
                        <>
                          <Check className="mr-2 h-4 w-4" />
                          Mark resolved
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
